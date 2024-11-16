import { Database, Namespace, Transaction } from "../types";

export class MapDatabase implements Database {
  private stores: Map<Namespace, Map<string, any>> = new Map();

  constructor() {
    this.stores.set("nodes", new Map());
    this.stores.set("relations", new Map());
    this.stores.set("trees", new Map());
  }

  async transaction(): Promise<Transaction> {
    return {
      get: async (store: Namespace, key: string) => {
        const storeMap = this.stores.get(store);
        return storeMap ? storeMap.get(key) || null : null;
      },
      getAll: async (store: Namespace) => {
        const storeMap = this.stores.get(store);
        return storeMap ? Array.from(storeMap.values()) : [];
      },
      getAllKeys: async (store: Namespace) => {
        const storeMap = this.stores.get(store);
        return storeMap ? Array.from(storeMap.keys()) : [];
      },
      put: async (store: Namespace, key: string, value: any) => {
        const storeMap = this.stores.get(store);
        if (storeMap) {
          storeMap.set(key, value);
        }
      },
      delete: async (store: Namespace, key: string) => {
        const storeMap = this.stores.get(store);
        if (storeMap) {
          storeMap.delete(key);
        }
      },
      update: async (store: Namespace, key: string, value: any) => {
        const storeMap = this.stores.get(store);
        if (storeMap) {
          // TODO throw if key doesn't exist
          storeMap.set(key, value);
        }
      },
      done: async () => {
        // No-op for in-memory implementation
      },
    };
  }

  async get(store: Namespace, key: string) {
    const storeMap = this.stores.get(store);
    return storeMap ? storeMap.get(key) || null : null;
  }

  async getAll(store: Namespace) {
    const storeMap = this.stores.get(store);
    return storeMap ? Array.from(storeMap.values()) : [];
  }

  async getAllKeys(store: Namespace) {
    const storeMap = this.stores.get(store);
    return storeMap ? Array.from(storeMap.keys()) : [];
  }

  async put(store: Namespace, key: string, value: any) {
    const storeMap = this.stores.get(store);
    if (storeMap) {
      storeMap.set(key, value);
    }
  }

  async delete(store: Namespace, key: string) {
    const storeMap = this.stores.get(store);
    if (storeMap) {
      storeMap.delete(key);
    }
  }

  async update(store: Namespace, key: string, value: any) {
    const storeMap = this.stores.get(store);
    if (storeMap) {
      storeMap.set(key, value);
    }
  }
}
