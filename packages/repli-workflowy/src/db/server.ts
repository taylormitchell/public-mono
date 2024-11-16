import { Database, Mutation, Operation } from "./types";

// TODO maybe make a wrapper around sqlite
export class ServerDatabase {
  private db: Database;
  private version: number = 0;
  private lastMutationByClient: Record<string, number> = {};
  private createdAtVersion: Record<string, number> = {};
  private updatedAtVersion: Record<string, number> = {};
  private deletedAtVersion: Record<string, number> = {};

  constructor(db: Database) {
    this.db = db;
  }

  async applyClientMutations(mutations: Mutation[]) {
    for (const mutation of mutations) {
      if (mutation.mutationId <= this.lastMutationByClient[mutation.clientId]) {
        continue;
      }
      const newVersion = this.version + 1;
      const createdIds = new Set<string>();
      const updatedIds = new Set<string>();
      const deletedIds = new Set<string>();
      const trx = await this.db.transaction();
      for (const op of mutation.operations) {
        if (op.type === "update") {
          await trx.update(op.namespace, op.id, op.data);
          this.updatedAtVersion[op.id] = newVersion;
          delete this.deletedAtVersion[op.id];
        } else if (op.type === "delete") {
          await trx.delete(op.namespace, op.id);
          this.updatedAtVersion[op.id] = newVersion;
          this.deletedAtVersion[op.id] = newVersion;
        } else if (op.type === "put") {
          await trx.put(op.namespace, op.id, op.data);
          this.createdAtVersion[op.id] = newVersion;
          this.updatedAtVersion[op.id] = newVersion;
          delete this.deletedAtVersion[op.id];
        } else {
          continue;
        }
      }
      await trx.done();
      for (const id of createdIds) {
        this.createdAtVersion[id] = newVersion;
      }
      for (const id of updatedIds) {
        this.updatedAtVersion[id] = newVersion;
      }
      for (const id of deletedIds) {
        this.deletedAtVersion[id] = newVersion;
      }
      this.version = newVersion;
      this.lastMutationByClient[mutation.clientId] = mutation.mutationId;
    }
  }

  async generatePatch(clientVersion: number, clientId: string) {
    const patch: Operation[] = [];

    if (clientVersion < this.version) {
      for (const namespace of ["nodes", "relations", "trees"] as const) {
        const allKeys = await this.db.getAllKeys(namespace);
        for (const id of allKeys) {
          const deletedAt = this.deletedAtVersion[id];
          const updatedAt = this.updatedAtVersion[id] || 0;
          if (deletedAt && deletedAt > clientVersion) {
            patch.push({ type: "delete", namespace, id });
          } else if (updatedAt > clientVersion) {
            const data = await this.db.get(namespace, id);
            patch.push({ type: "put", namespace, id, data });
          }
        }
      }
    }

    return {
      clientId,
      patch,
      lastMutationId: this.lastMutationByClient[clientId] || 0,
      dbVersion: this.version,
    };
  }

  async dump() {
    const dump: Record<string, any> = {
      version: this.version,
    };
    const trx = await this.db.transaction();

    for (const namespace of ["nodes", "relations", "trees"] as const) {
      const allData = await trx.getAll(namespace);
      dump[namespace] = allData.reduce((acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      }, {} as Record<string, any>);
    }

    await trx.done();

    return dump;
  }
}
