import { z } from "zod";

export const TODO_KEYWORDS = ["TODO", "DOING", "DONE", "MAYBE", "WAITING"] as const;
export const TODO_REGEX = new RegExp(`^-?\\s*(${TODO_KEYWORDS.join("|")})`);
export type TodoStatus = (typeof TODO_KEYWORDS)[number];

export const HeadingSchema = z.object({
  type: z.literal("heading"),
  level: z.number().int().positive(),
  text: z.string(),
});

export const TodoStatusSchema = z.enum(TODO_KEYWORDS);

export const TodoSchema = z.object({
  type: z.literal("todo"),
  text: z.string(),
  status: TodoStatusSchema,
  due: z.date().optional(),
  id: z.string().optional(),
  filename: z.string().optional(),
  relativeFilename: z.string().optional(),
  headings: z.array(HeadingSchema).optional(),
});

export const TodoSerializedSchema = TodoSchema.extend({
  due: z
    .string()
    .optional()
    .refine((value) => value === undefined || /^\d{4}-\d{2}-\d{2}/.test(value), {
      message: "Due date must start with yyyy-mm-dd format",
    }),
})
  .omit({ due: true })
  .merge(z.object({ due: z.string().optional() }));

export type Heading = z.infer<typeof HeadingSchema>;
export type Todo = z.infer<typeof TodoSchema>;
export type TodoSerialized = z.infer<typeof TodoSerializedSchema>;

export function deserializeTodo(todo: any) {
  if (typeof todo !== "object" || todo === null) {
    throw new Error("Todo is not an object");
  }
  todo = { ...todo, type: "todo", status: todo?.status || "TODO" };
  const serializedTodo = TodoSerializedSchema.parse(todo);
  let due: Date | undefined;
  if (serializedTodo.due) {
    const [year, month, day] = serializedTodo.due.slice(0, 10).split("-").map(Number);
    due = new Date(year, month - 1, day);
    if (isNaN(due.getTime())) {
      throw new Error("Invalid due date");
    }
  }
  return TodoSchema.parse({ ...serializedTodo, due });
}

export function serializeTodo(todo: Todo): TodoSerialized {
  return {
    ...todo,
    due: todo.due ? todo.due.toISOString().split("T")[0] : undefined,
  };
}
