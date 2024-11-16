import { IDBPDatabase, openDB } from "idb";
import { Database, MyDBSchema, Transaction, namespaces, Namespace } from "./types";

export class IndexedDbDatabase implements Database {
  private db: Promise<IDBPDatabase<MyDBSchema>>;

  constructor() {
    this.db = openDB("myDatabase", 1, {
      upgrade(db) {
        db.createObjectStore("nodes", { keyPath: "id" });
        db.createObjectStore("relations", { keyPath: "id" });
        db.createObjectStore("trees", { keyPath: "id" });
      },
    });
  }

  async transaction(): Promise<Transaction> {
    const db = await this.db;
    const trx = db.transaction(namespaces, mode);
    return {
      get: async (store: Namespace, key: string) => {
        return await trx.objectStore(store).get(key);
      },
      getAll: async (store: Namespace) => {
        return await trx.objectStore(store).getAll();
      },
      getAllKeys: async (store: Namespace) => {
        return await trx.objectStore(store).getAllKeys();
      },
      put: async (store: Namespace, key: string, value: any) => {
        const s = trx.objectStore(store);
        await s.put(value, key);
      },
      delete: async (store: Namespace, key: string) => {
        const s = trx.objectStore(store);
        await s.delete(key);
      },
      update: async (store: Namespace, key: string, value: any) => {
        const s = trx.objectStore(store);
        await s.put(value, key);
      },
      done: () => trx.done,
    };
  }

  async get(store: Namespace, key: string) {
    const db = await this.db;
    return await db.get(store, key);
  }

  async getAll(store: Namespace) {
    const db = await this.db;
    return await db.getAll(store);
  }

  async getAllKeys(store: Namespace) {
    const db = await this.db;
    return await db.getAllKeys(store);
  }

  async put(store: Namespace, key: string, value: any) {
    const db = await this.db;
    await db.put(store, value, key);
  }

  async update(store: Namespace, key: string, value: any) {
    const db = await this.db;
    await db.put(store, value, key);
  }

  async delete(store: Namespace, key: string) {
    const db = await this.db;
    await db.delete(store, key);
  }
}
