import { z } from "zod";

export const ProjectSchema = z.object({
  model: z.literal("project"),
  id: z.string(),
  props: z.object({
    title: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
    deletedAt: z.number().nullable(),
  }),
});

export const IssueSchema = z.object({
  model: z.literal("issue"),
  id: z.string(),
  props: z.object({
    projectId: z.string().nullable(),
    title: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
    deletedAt: z.number().nullable(),
  }),
});

export const RelationSchema = z.object({
  model: z.literal("relation"),
  id: z.string(),
  props: z.object({
    fromId: z.string(),
    toId: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
    deletedAt: z.number().nullable(),
  }),
});

export type ProjectData = z.infer<typeof ProjectSchema>;

export type IssueData = z.infer<typeof IssueSchema>;

export type RelationData = z.infer<typeof RelationSchema>;

export const ProjectPropsSchema = ProjectSchema.shape.props;

export const IssuePropsSchema = IssueSchema.shape.props;

export const RelationPropsSchema = RelationSchema.shape.props;

export type IssueProps = z.infer<typeof IssuePropsSchema>;

export type ProjectProps = z.infer<typeof ProjectPropsSchema>;

export type RelationProps = z.infer<typeof RelationPropsSchema>;

export const ModelNames = ["project", "issue", "relation"] as const;

export type ModelSchemas = {
  project: typeof ProjectSchema;
  issue: typeof IssueSchema;
  relation: typeof RelationSchema;
};

export type ModelName = (typeof ModelNames)[number];

export type UpdateEvent<K extends keyof ModelSchemas> = {
  operation: "update";
  model: K;
  id: string;
  // TODO: maybe do { [key: string]: { old: any; new: any } }
  oldProps: Partial<z.infer<ModelSchemas[K]["shape"]["props"]>>;
  newProps: Partial<z.infer<ModelSchemas[K]["shape"]["props"]>>;
};

export type CreateEvent<K extends keyof ModelSchemas> = {
  operation: "create";
  model: K;
  id: string;
  props: z.infer<ModelSchemas[K]["shape"]["props"]>;
};

export type DeleteEvent<K extends keyof ModelSchemas> = {
  operation: "delete";
  model: K;
  id: string;
  props: z.infer<ModelSchemas[K]["shape"]["props"]>;
};

export type SetEvent<K extends keyof ModelSchemas> = {
  operation: "set";
  model: K;
  id: string;
  oldProps: z.infer<ModelSchemas[K]["shape"]["props"]> | null;
  newProps: z.infer<ModelSchemas[K]["shape"]["props"]> | null;
};

export type Event =
  | ({ model: "project" } & (
      | UpdateEvent<"project">
      | CreateEvent<"project">
      | DeleteEvent<"project">
      | SetEvent<"project">
    ))
  | ({ model: "issue" } & (
      | UpdateEvent<"issue">
      | CreateEvent<"issue">
      | DeleteEvent<"issue">
      | SetEvent<"issue">
    ))
  | ({ model: "relation" } & (
      | UpdateEvent<"relation">
      | CreateEvent<"relation">
      | DeleteEvent<"relation">
      | SetEvent<"relation">
    ));

export function reverseEvent(event: Event): Event {
  switch (event.operation) {
    case "create":
      switch (event.model) {
        case "project":
          return { operation: "delete", model: "project", id: event.id, props: event.props };
        case "issue":
          return { operation: "delete", model: "issue", id: event.id, props: event.props };
        case "relation":
          return { operation: "delete", model: "relation", id: event.id, props: event.props };
        default:
          return event satisfies never;
      }
    case "update":
      return {
        operation: "update",
        model: event.model,
        id: event.id,
        oldProps: event.newProps,
        newProps: event.oldProps,
      };
    case "delete":
      return {
        operation: "update",
        model: event.model,
        id: event.id,
        oldProps: event.props,
        newProps: event.props,
      };
    case "set":
      switch (event.model) {
        case "project":
          return {
            operation: "set",
            model: event.model,
            id: event.id,
            oldProps: event.newProps,
            newProps: event.oldProps,
          };
        case "issue":
          return {
            operation: "set",
            model: event.model,
            id: event.id,
            oldProps: event.newProps,
            newProps: event.oldProps,
          };
        case "relation":
          return {
            operation: "set",
            model: event.model,
            id: event.id,
            oldProps: event.newProps,
            newProps: event.oldProps,
          };
        default:
          return event satisfies never;
      }
  }
}
