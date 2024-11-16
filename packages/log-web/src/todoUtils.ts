import { useState, useEffect } from "react";
import { deserializeTodo, Todo } from "@common/todo/types";

const apiUrl = import.meta.env.VITE_API_URL;

export function useTodos(jwt: string | null) {
  const [todos, setTodos] = useState<Todo[]>([]);

  async function fetchTodos(jwt: string) {
    const res = await fetch(`${apiUrl}/api/todos`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (res.ok) {
      const data = await res.json();
      console.log(data);
      try {
        const todos = data.todos
          .map((todo: unknown) => {
            try {
              return deserializeTodo(todo);
            } catch (e) {
              console.error("Error deserializing todo:", todo, e);
              return null;
            }
          })
          .filter((todo: Todo | null): todo is Todo => todo !== null);
        setTodos(todos);
      } catch (e) {
        console.error("Error processing todos", e);
      }
    }
  }

  useEffect(() => {
    if (jwt) {
      fetchTodos(jwt);
    }
  }, [jwt]);

  return { todos, refetch: fetchTodos };
}

export const extractFilenameKeywords = (filename: string): string[] => {
  return filename
    .replace(/\.[^/.]+$/, "")
    .split(/[/\\._-]/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
};

export const groupTodosByDueDate = (todos: Todo[]): Record<string, Todo[]> => {
  const grouped = todos.reduce((acc, todo) => {
    const dueDate = todo.due ? todo.due.toDateString() : "No Due Date";
    if (!acc[dueDate]) {
      acc[dueDate] = [];
    }
    acc[dueDate].push(todo);
    return acc;
  }, {} as Record<string, Todo[]>);

  return Object.fromEntries(
    Object.entries(grouped).sort((a, b) => {
      if (a[0] === "No Due Date") return 1;
      if (b[0] === "No Due Date") return -1;
      return new Date(a[0]).getTime() - new Date(b[0]).getTime();
    })
  );
};

export const groupTodosByFilename = (todos: Todo[]): Record<string, Todo[]> => {
  return todos.reduce((acc, todo) => {
    const filename = todo.relativeFilename || "Unspecified";
    if (!acc[filename]) {
      acc[filename] = [];
    }
    acc[filename].push(todo);
    return acc;
  }, {} as Record<string, Todo[]>);
};
