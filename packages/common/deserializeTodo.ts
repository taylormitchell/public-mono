import { Todo } from "./todo/types";

export function deserializeTodo(todo: Omit<Todo, "due"> & { due?: string }): Todo {
  let due: Date | undefined;
  if (todo.due) {
    const [year, month, day] = todo.due.split("-").map(Number);
    due = new Date(year, month - 1, day);
  }
  return { ...todo, due };
}
