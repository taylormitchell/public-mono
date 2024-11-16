import { generateId, operationsToDependencies, reverseOperations } from "./utils";
import {
  Operation,
  Database,
  Namespace,
  Transaction,
  isWriteOperation,
  Mutation,
  Dep,
} from "./types";
import { IndexedDbDatabase } from "./indexeddb";

type Subscription = (tx: Transaction) => void | Promise<void>;
type MutationCallback = (tx: Transaction) => void | Promise<void>;
type QueryCallback<T> = (tx: Transaction) => T | Promise<T>;

export class ClientDatabase {
  private clientId = generateId();
  private subscribers: Map<Subscription, { deps: Set<Dep> }> = new Map();
  // TODO persist this stuff
  private lastSyncVersion = 0;
  private lastMutationId = 0;
  private localMutations: Mutation[] = [];

  constructor(
    private db: Database,
    private syncHandlers?: {
      push: (mutations: Mutation[]) => Promise<void>;
      pull: (params: { clientId: string; dbVersionAtLastSync: number }) => Promise<{
        clientId: string;
        patch: Operation[];
        lastMutationId: number;
        dbVersion: number;
      }>;
    }
  ) {}

  async push() {
    await this.syncHandlers?.push(this.localMutations);
  }

  // TODO prevent both tabs from pulling
  async pull() {
    if (!this.syncHandlers) return;
    const { patch, lastMutationId, dbVersion } = await this.syncHandlers.pull({
      clientId: this.clientId,
      dbVersionAtLastSync: this.lastSyncVersion,
    });

    const operations: Operation[] = [];
    // add roll back operations
    operations.push(...reverseOperations(this.localMutations.map((m) => m.operations).flat()));
    // add patch operations from server
    operations.push(...patch);
    // add local mutations that the server hasn't seen yet
    const unseenMutations = this.localMutations.filter((m) => m.mutationId > lastMutationId);
    operations.push(...unseenMutations.map((m) => m.operations).flat());
    // apply
    await this.applyOperations(operations);

    this.localMutations = this.localMutations.slice(lastMutationId);
    this.lastSyncVersion = dbVersion;
    this.notifySubscribers(operationsToDependencies(operations));
  }

  subscribe(callback: Subscription) {
    this.subscribers.set(callback, { deps: new Set() });
    this.runSubscription(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private async applyOperations(operations: Operation[]) {
    const trx = await this.db.transaction();
    for (const operation of operations) {
      if (isWriteOperation(operation)) {
        if (operation.type === "update") {
          await trx.update(operation.namespace, operation.id, operation.data);
        } else if (operation.type === "put") {
          await trx.put(operation.namespace, operation.id, operation.data);
        } else if (operation.type === "delete") {
          await trx.delete(operation.namespace, operation.id);
        } else {
          operation satisfies never;
        }
      }
    }
    await trx.done();
  }

  // TODO should be read-only
  private async runSubscription(callback: Subscription) {
    const dx = await createTrackingTransaction(this.db);
    await callback(dx);
    const operations = await dx.doneWithOperations();
    const deps = operationsToDependencies(operations);
    this.subscribers.set(callback, { deps });
  }

  private mutationInProgress: Promise<void> = Promise.resolve();

  async mutate(callback: MutationCallback): Promise<Mutation> {
    return new Promise((resolve) => {
      this.mutationInProgress = this.mutationInProgress.then(async () => {
        // Apply operations
        const dx = await createTrackingTransaction(this.db);
        await callback(dx);
        const operations = await dx.doneWithOperations();

        // Track mutation
        this.lastMutationId++;
        const mutation: Mutation = {
          clientId: this.clientId,
          mutationId: this.lastMutationId,
          operations,
        };
        console.log("mutate", mutation);
        this.localMutations.push(mutation);

        // Notify subscribers
        const writeOperations = operations.filter((op) => isWriteOperation(op));
        await this.notifySubscribers(operationsToDependencies(writeOperations));
        resolve(mutation);
      });
    });
  }

  async query<T>(callback: QueryCallback<T>): Promise<T> {
    return callback(await this.db.transaction());
  }

  private async notifySubscribers(affectedDeps: Set<Dep>): Promise<void> {
    for (const [callback, { deps: subscriberDeps }] of this.subscribers.entries()) {
      for (const dep of affectedDeps.values()) {
        if (subscriberDeps.has(dep)) {
          this.runSubscription(callback);
          break;
        }
      }
    }
  }

  async dump() {
    const trx = await this.db.transaction();
    const dump: Record<string, any> = {
      version: this.lastSyncVersion,
    };
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

async function createTrackingTransaction(
  db: Database
): Promise<Transaction & { doneWithOperations: () => Promise<Operation[]> }> {
  const operations: Operation[] = [];
  let done = false;
  const trx = await db.transaction();

  return {
    async get(store: Namespace, key: string): Promise<any> {
      if (done) throw new Error("Transaction already completed");
      operations.push({ type: "get", namespace: store, id: key });
      return trx.get(store, key);
    },

    async getAll(store: Namespace): Promise<any[]> {
      if (done) throw new Error("Transaction already completed");
      operations.push({ type: "getAll", namespace: store });
      return trx.getAll(store);
    },

    async getAllKeys(store: Namespace): Promise<string[]> {
      if (done) throw new Error("Transaction already completed");
      operations.push({ type: "getAllKeys", namespace: store });
      return trx.getAllKeys(store);
    },

    async put(store: Namespace, key: string, value: any): Promise<void> {
      if (done) throw new Error("Transaction already completed");
      operations.push({ type: "put", namespace: store, id: key, data: value });
      return trx.put(store, key, value);
    },

    async delete(store: Namespace, key: string): Promise<void> {
      if (done) throw new Error("Transaction already completed");
      const prevData = await trx.get(store, key);
      operations.push({ type: "delete", namespace: store, id: key, prevData });
      return trx.delete(store, key);
    },

    async update(store: Namespace, key: string, value: any): Promise<void> {
      if (done) throw new Error("Transaction already completed");
      const prevData = await trx.get(store, key);
      operations.push({
        type: "update",
        namespace: store,
        id: key,
        prevData,
        data: value,
      });
      return trx.update(store, key, value);
    },

    async done(): Promise<void> {
      done = true;
      return trx.done();
    },

    async doneWithOperations(): Promise<Operation[]> {
      done = true;
      await trx.done();
      return operations;
    },
  };
}

export function init(): ClientDatabase {
  const db = new IndexedDbDatabase();
  return new ClientDatabase(db);
}
