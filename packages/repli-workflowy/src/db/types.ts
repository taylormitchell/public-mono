import { z } from "zod";

// Types
export const NodeSchema = z.object({
  namespace: z.literal("nodes"),
  id: z.string(),
  text: z.string(),
});

export const RelationSchema = z.object({
  namespace: z.literal("relations"),
  id: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  position: z.string(),
});

export const TreeSchema = z.object({
  namespace: z.literal("trees"),
  id: z.string(),
  rootId: z.string().nullable(),
});

export type Node = z.infer<typeof NodeSchema>;
export type Relation = z.infer<typeof RelationSchema>;
export type Tree = z.infer<typeof TreeSchema>;

export type ModelSchema = typeof NodeSchema | typeof RelationSchema | typeof TreeSchema;

export type SchemaToOperations<T extends z.ZodType> = {
  update: {
    type: "update";
    namespace: z.infer<T>["namespace"];
    id: string;
    data: z.infer<T>;
    prevData?: z.infer<T>;
  };
  delete: {
    type: "delete";
    namespace: z.infer<T>["namespace"];
    id: string;
    prevData?: z.infer<T>;
  };
  put: {
    type: "put";
    namespace: z.infer<T>["namespace"];
    id: string;
    data: z.infer<T>;
  };
  get: { type: "get"; namespace: z.infer<T>["namespace"]; id: string };
  getAll: { type: "getAll"; namespace: z.infer<T>["namespace"] };
  getAllKeys: { type: "getAllKeys"; namespace: z.infer<T>["namespace"] };
};

export type Operation = {
  [S in ModelSchema as S["shape"]["namespace"]["value"]]: SchemaToOperations<S>[keyof SchemaToOperations<S>];
}[ModelSchema["shape"]["namespace"]["value"]];

export type MyDBSchema = {
  [K in ModelSchema["shape"]["namespace"]["value"]]: {
    key: string;
    value: z.infer<Extract<ModelSchema, { shape: { namespace: { value: K } } }>>;
  };
};

export type Namespace = ModelSchema["shape"]["namespace"]["value"];
export const namespaces: Namespace[] = ["nodes", "relations", "trees"];

export type Dep = string;

export interface Transaction {
  get: (store: Namespace, key: string) => Promise<any>;
  getAll: (store: Namespace) => Promise<any[]>;
  getAllKeys: (store: Namespace) => Promise<string[]>;
  put: (store: Namespace, key: string, value: any) => Promise<void>;
  delete: (store: Namespace, key: string) => Promise<void>;
  update: (store: Namespace, key: string, value: any) => Promise<void>;
  done: () => Promise<void>;
}

export interface Database {
  transaction: () => Promise<Transaction>;
  get: (store: Namespace, key: string) => Promise<any>;
  getAll: (store: Namespace) => Promise<any[]>;
  getAllKeys: (store: Namespace) => Promise<string[]>;
  put: (store: Namespace, key: string, value: any) => Promise<void>;
  delete: (store: Namespace, key: string) => Promise<void>;
  update: (store: Namespace, key: string, value: any) => Promise<void>;
}

export function isWriteOperation(operation: Operation) {
  return operation.type === "put" || operation.type === "update" || operation.type === "delete";
}

export type Mutation = {
  clientId: string;
  mutationId: number;
  operations: Operation[];
};
