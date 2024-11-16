import { v4 as uuidv4 } from "uuid";
import { Operation, isWriteOperation } from "./types";

export function generateId() {
  return uuidv4();
}

export function generateNodeId() {
  return `nod-${generateId()}`;
}

export function generateRelationId() {
  return `rel-${generateId()}`;
}

export const createDep = {
  object: (namespace: string, id: string, part: "key" | "value") => {
    return `${namespace}/${id}/${part}`;
  },
  namespace: (namespace: string, part: "keys" | "values") => {
    return `${namespace}/${part}`;
  },
};

export function operationsToDependencies(operations: Operation[]): Set<string> {
  const dependencies = new Set<string>();

  for (const operation of operations) {
    const { type, namespace, id } = operation;

    switch (type) {
      case "put":
      case "update":
        dependencies.add(createDep.object(namespace, id, "value"));
        dependencies.add(createDep.namespace(namespace, "values"));
        dependencies.add(createDep.namespace(namespace, "keys"));
        break;
      case "delete":
        dependencies.add(createDep.object(namespace, id, "value"));
        dependencies.add(createDep.object(namespace, id, "key"));
        dependencies.add(createDep.namespace(namespace, "values"));
        dependencies.add(createDep.namespace(namespace, "keys"));
        break;
      case "get":
        dependencies.add(createDep.object(namespace, id, "value"));
        dependencies.add(createDep.object(namespace, id, "key"));
        break;
    }
  }

  return dependencies;
}

export function reverseOperations(operations: Operation[]): Operation[] {
  const reversed: Operation[] = [];
  for (const operation of operations.toReversed()) {
    if (!isWriteOperation(operation)) {
      // ignore reads
      continue;
    }
    if (operation.type === "put") {
      reversed.push({
        ...operation,
        type: "delete",
        prevData: operation.data,
      });
    } else if (operation.type === "delete") {
      reversed.push({
        ...operation,
        type: "put",
        data: operation.prevData,
      });
    } else if (operation.type === "update") {
      reversed.push({
        ...operation,
        type: "update",
        data: operation.prevData,
        prevData: operation.data,
      });
    } else {
      operation satisfies never;
    }
  }
  return reversed;
}
