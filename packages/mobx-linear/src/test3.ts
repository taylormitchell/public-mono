import { makeAutoObservable, reaction, runInAction } from "mobx";
import {
  ModelName,
  Event2,
  IssueData,
  IssueSchema,
  IssueProps,
  ProjectData,
  ProjectProps,
  ProjectSchema,
  RelationData,
  RelationSchema,
  RelationProps,
} from "./types";
import { z } from "zod";

/**
 * TODOs
 * - DONE Define the serialized state schemas for each model.
 * - DONE Derive the serialized events from the serialized state schemas.
 * - Methods for serializing and deserializing props and tracking changes.
 *   For now, don't get fancy with these. Just do it right on the models.
 *   The models are then responsible for knowing how to map b/w ids and models
 *   (e.g. which foreign key maps to which model?)
 */

function reverseEvent(event: Event2): Event2 {
  switch (event.operation) {
    case "create":
      switch (event.model) {
        case "project":
          return { operation: "delete", model: "project", id: event.id, props: event.props };
        case "issue":
          return { operation: "delete", model: "issue", id: event.id, props: event.props };
        case "relation":
          return { operation: "delete", model: "relation", id: event.id, props: event.props };
      }
      break;
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

class Store {
  issues: Map<string, IssueModel> = new Map();
  projects: Map<string, ProjectModel> = new Map();
  relations: Map<string, RelationModel> = new Map();
  trackingChanges: boolean = true;

  undoStack: Event2[][] = [];
  redoStack: Event2[][] = [];

  uncommittedChanges: Event2[] = [];
  // Using an observable number to trigger a reaction b/c if we track the change array,
  // the reaction will need to modify it too (clear it) which you're not supposed to do
  // inside reactions.
  // TODO not sure about this. sketch I need to do it in applyUntrackedChange?
  changeCount: number = 0;

  constructor() {
    makeAutoObservable(this, {
      uncommittedChanges: false,
    });
    reaction(
      () => this.changeCount,
      () => {
        this.undoStack.push(this.uncommittedChanges.slice());
        this.redoStack = [];
        this.uncommittedChanges = [];
      }
    );
  }

  undo() {
    const events = this.undoStack.pop();
    if (events) {
      const reversedEvents = events.reverse().map(reverseEvent);
      for (const event of reversedEvents) {
        this.applyChange(event);
      }
      this.changeCount++;
      this.redoStack.push(reversedEvents);
    }
  }

  redo() {
    const events = this.redoStack.pop();
    if (events) {
      for (const event of events) {
        this.applyChange(event);
      }
      this.changeCount++;
      this.undoStack.push(events);
    }
  }

  addChange(change: Event2) {
    if (this.trackingChanges) {
      this.changeCount++;
      this.uncommittedChanges.push(change);
    }
  }

  /**
   * @throws if a referenced model does not exist
   */
  applyChange(change: Event2) {
    switch (change.operation) {
      case "create":
        switch (change.model) {
          case "project":
            this.createProject(change.id, change.props);
            break;
          case "issue":
            this.createIssue(
              change.id,
              IssuePropsRefdSchema.parse(this.deserializeIssueProps(change.props))
            );
            break;
          case "relation":
            this.createRelation(change.id, change.props);
            break;
        }
        break;
      case "update":
        switch (change.model) {
          case "project": {
            const project = this.projects.get(change.id);
            if (!project) {
              throw new Error(`Project with id ${change.id} does not exist`);
            }
            this.updateProject(change.id, this.deserializeProjectProps(change.newProps));
            break;
          }
          case "issue": {
            const issue = this.issues.get(change.id);
            if (!issue) {
              throw new Error(`Issue with id ${change.id} does not exist`);
            }
            this.updateIssue(change.id, this.deserializeIssueProps(change.newProps));
            break;
          }
          case "relation": {
            const relation = this.relations.get(change.id);
            if (!relation) {
              throw new Error(`Relation with id ${change.id} does not exist`);
            }
            this.updateRelation(change.id, this.deserializeRelationProps(change.newProps));
            break;
          }
        }
        break;
      case "delete":
        switch (change.model) {
          case "project":
            this.deleteProject(change.id);
            break;
          case "issue":
            this.deleteIssue(change.id);
            break;
          case "relation":
            this.deleteRelation(change.id);
            break;
        }
        break;
      case "set":
        switch (change.model) {
          case "project": {
            if (change.newProps === null) {
              this.deleteProject(change.id);
            } else {
              const project = this.projects.get(change.id);
              if (!project) {
                this.createProject(change.id, change.newProps);
              } else {
                this.updateProject(change.id, this.deserializeProjectProps(change.newProps));
              }
            }
            break;
          }
          case "issue": {
            if (change.newProps === null) {
              this.deleteIssue(change.id);
            } else {
              const issue = this.issues.get(change.id);
              if (!issue) {
                const project = change.newProps.projectId
                  ? this.projects.get(change.newProps.projectId)
                  : null;
                if (project === undefined) {
                  throw new Error(`Project with id ${change.newProps.projectId} does not exist`);
                }
                this.createIssue(change.id, { ...change.newProps, project });
              } else {
                this.updateIssue(change.id, this.deserializeIssueProps(change.newProps));
              }
            }
            break;
          }
          case "relation": {
            if (change.newProps === null) {
              this.deleteRelation(change.id);
            } else {
              const relation = this.relations.get(change.id);
              if (!relation) {
                this.createRelation(change.id, change.newProps);
              } else {
                this.updateRelation(change.id, this.deserializeRelationProps(change.newProps));
              }
            }
            break;
          }
        }
        break;
      default:
        change satisfies never;
    }
  }

  private loadProject(data: ProjectData) {
    this.trackingChanges = false;
    let project = this.projects.get(data.id);
    const props = this.deserializeProjectProps(data.props, "create");
    if (project) {
      project.populatePlaceholder(props);
    } else {
      project = new ProjectModel(this, data.id, { state: props });
      this.projects.set(data.id, project);
    }
    this.trackingChanges = true;
    return project;
  }

  // TODO do we even need these? can't this just be a SET event?
  private loadIssue(data: IssueData) {
    this.trackingChanges = false;
    const props = this.deserializeIssueProps(data.props, "create");
    let issue = this.issues.get(data.id);
    if (issue) {
      issue.populatePlaceholder(props);
    } else {
      issue = new IssueModel(this, data.id, { state: props });
      this.issues.set(data.id, issue);
    }
    this.trackingChanges = true;
    return issue;
  }

  private withTrackingDisabled<T>(fn: () => T): T {
    const prev = this.trackingChanges;
    this.trackingChanges = false;
    const result = fn();
    this.trackingChanges = prev;
    return result;
  }

  private loadRelation(data: RelationData) {
    let relation = this.relations.get(data.id);
    const props = RelationPropsRefdSchema.parse(
      this.deserializeRelationProps(data.props, "create")
    );
    if (relation) {
      relation.populatePlaceholder(props);
    } else {
      relation = new RelationModel(this, data.id, { state: props });
      this.relations.set(data.id, relation);
    }
    this.trackingChanges = true;
    return relation;
  }

  load({
    projects = [],
    issues = [],
    relations = [],
  }: {
    projects?: ProjectData[];
    issues?: IssueData[];
    relations?: RelationData[];
  }) {
    this.trackingChanges = false;
    try {
      for (const project of projects) {
        this.loadProject(project);
      }
      for (const issue of issues) {
        this.loadIssue(issue);
      }
      for (const relation of relations) {
        this.loadRelation(relation);
      }
    } catch (e) {
      this.projects.clear();
      this.issues.clear();
      this.relations.clear();
      throw e;
    } finally {
      this.trackingChanges = true;
    }
  }

  private getOrCreateIssue(id: string, props?: Partial<IssuePropsRefd>) {
    let issue = this.issues.get(id);
    if (issue) {
      return issue;
    } else if (props) {
      issue = new IssueModel(this, id, { state: props });
      this.issues.set(id, issue);
      return issue;
    } else {
      issue = IssueModel.createPlaceholder(this, id);
      this.issues.set(id, issue);
      return issue;
    }
  }

  private getIssueOrThrow(id: string) {
    const issue = this.issues.get(id);
    if (!issue) {
      throw new Error(`Issue with id ${id} does not exist`);
    }
    return issue;
  }

  private getOrCreateProject(id: string, props?: Partial<ProjectPropsRefd>) {
    let project = this.projects.get(id);
    if (project) {
      return project;
    } else {
      project = props
        ? new ProjectModel(this, id, { state: props })
        : ProjectModel.createPlaceholder(this, id);
      this.projects.set(id, project);
      return project;
    }
  }

  private getProjectOrThrow(id: string) {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`Project with id ${id} does not exist`);
    }
    return project;
  }

  createIssue(id: string, props: IssuePropsRefd) {
    if (this.issues.has(id)) {
      throw new Error(`Issue with id ${id} already exists`);
    }
    this.trackingChanges = false;
    const issue = new IssueModel(this, id, { state: props });
    this.trackingChanges = true;
    this.issues.set(id, issue);
    this.addChange({
      operation: "create",
      model: "issue",
      id,
      props: issue.serializeProps(props),
    });
    return issue;
  }

  createProject(id: string, props: Partial<ProjectPropsRefd>) {
    if (this.projects.has(id)) {
      throw new Error(`Project with id ${id} already exists`);
    }
    this.trackingChanges = false;
    const project = new ProjectModel(this, id, { state: props });
    this.trackingChanges = true;
    this.projects.set(id, project);
    this.addChange({
      operation: "create",
      model: "project",
      id,
      props: this.serializeProps(props),
    });
    return project;
  }

  createRelation(id: string, props: Partial<RelationPropsRefd>) {
    if (this.relations.has(id)) {
      throw new Error(`Relation with id ${id} already exists`);
    }
    this.trackingChanges = false;
    const relation = new RelationModel(this, id, { state: props });
    this.trackingChanges = true;
    this.relations.set(id, relation);
    this.addChange({
      operation: "create",
      model: "relation",
      id,
      props: relation.serializeProps(props),
    });
    return relation;
  }

  deleteIssue(id: string) {
    const issue = this.issues.get(id);
    if (!issue) {
      throw new Error(`Issue with id ${id} does not exist`);
    }
    this.addChange({
      operation: "delete",
      model: "issue",
      id,
      oldProps: issue.serializeProps(issue._internal.props),
    });
    this.issues.delete(id);
  }

  deleteProject(id: string) {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`Project with id ${id} does not exist`);
    }
    this.addChange({
      operation: "delete",
      model: "project",
      id,
      oldProps: this.serializeProps(project._state),
    });
    this.projects.delete(id);
  }

  deleteRelation(id: string) {
    const relation = this.relations.get(id);
    if (!relation) {
      throw new Error(`Relation with id ${id} does not exist`);
    }
    this.addChange({
      operation: "delete",
      model: "relation",
      id,
      oldProps: this.serializeProps(relation._state),
    });
    this.relations.delete(id);
  }

  updateIssue(id: string, props: Partial<IssuePropsRefd>) {
    const issue = this.issues.get(id);
    if (!issue) {
      throw new Error(`Issue with id ${id} does not exist`);
    }
    const oldProps = {} as any;
    for (const key in props) {
      if (key in issue._internal.props) {
        oldProps[key] = issue._internal.props[key as keyof IssuePropsRefd];
      }
    }
    this.addChange({
      operation: "update",
      model: "issue",
      id,
      oldProps: this.serializeIssueProps(oldProps),
      newProps: this.serializeIssueProps(props),
    });
    if (props.project) {
      moveIssueToProject(issue, props.project);
    }
  }

  updateProject(id: string, props: Partial<ProjectPropsRefd>) {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`Project with id ${id} does not exist`);
    }
    const oldProps = {} as any;
    for (const key in props) {
      if (key in project._internal.props) {
        oldProps[key] = project._internal.props[key as keyof ProjectPropsRefd];
      }
    }
    this.addChange({
      operation: "update",
      model: "project",
      id,
      oldProps: this.serializeProjectProps(oldProps),
      newProps: this.serializeProjectProps(props),
    });
  }

  updateRelation(id: string, props: Partial<RelationPropsRefd>) {
    const relation = this.relations.get(id);
    if (!relation) {
      throw new Error(`Relation with id ${id} does not exist`);
    }
    const oldProps = {} as any;
    for (const key in props) {
      if (key in relation._internal.props) {
        oldProps[key] = relation._internal.props[key as keyof RelationPropsRefd];
      }
    }
    this.addChange({
      operation: "update",
      model: "relation",
      id,
      oldProps: this.serializeRelationProps(oldProps),
      newProps: this.serializeRelationProps(props),
    });
    if (props.from) {
      updateRelationIssues(relation, { from: props.from });
    }
    if (props.to) {
      updateRelationIssues(relation, { to: props.to });
    }
  }

  deserializeIssueProps(
    props: Partial<IssueProps>,
    onMissing: "create" | "error" = "error"
  ): Partial<IssuePropsRefd> {
    const deserialized: Partial<IssuePropsRefd> = {};
    for (const key in props) {
      const typedKey = key as keyof IssuePropsRefd;
      switch (typedKey) {
        case "project":
          if (props.projectId) {
            deserialized.project =
              onMissing === "create"
                ? this.getOrCreateProject(props.projectId)
                : this.getProjectOrThrow(props.projectId);
          } else {
            deserialized.project = null;
          }
          break;
        case "createdAt":
          deserialized[typedKey] = props[typedKey];
          break;
        case "updatedAt":
          deserialized[typedKey] = props[typedKey];
          break;
        case "deletedAt":
          deserialized[typedKey] = props[typedKey];
          break;
        case "title":
          deserialized[typedKey] = props[typedKey];
          break;
        default:
          typedKey satisfies never;
      }
    }
    return deserialized;
  }

  serializeIssueProps(props: Partial<IssuePropsRefd>): Partial<IssueProps> {
    const serialized = {} as Partial<IssueProps>;
    for (const key in props) {
      const typedKey = key as keyof IssuePropsRefd;
      switch (typedKey) {
        case "title":
          serialized.title = props.title;
          break;
        case "createdAt":
          serialized.createdAt = props.createdAt;
          break;
        case "updatedAt":
          serialized.updatedAt = props.updatedAt;
          break;
        case "deletedAt":
          serialized.deletedAt = props.deletedAt;
          break;
        case "project":
          serialized.projectId = props.project?.id ?? null;
          break;
        default:
          typedKey satisfies never;
      }
    }
    return serialized;
  }

  deserializeProjectProps(
    props: Partial<ProjectProps>,
    onMissing: "create" | "error" = "error"
  ): Partial<ProjectPropsRefd> {
    return props;
  }

  serializeProjectProps(props: Partial<ProjectPropsRefd>): Partial<ProjectProps> {
    return props;
  }

  deserializeRelationProps(
    props: Partial<RelationProps>,
    onMissing: "create" | "error" = "error"
  ): Partial<RelationPropsRefd> {
    const deserialized: Partial<RelationPropsRefd> = {};
    for (const key in props) {
      const typedKey = key as keyof RelationProps;
      if (!props[typedKey]) continue;
      switch (typedKey) {
        case "fromId":
          deserialized.from =
            onMissing === "create"
              ? this.getOrCreateIssue(props[typedKey])
              : this.getIssueOrThrow(props[typedKey]);
          break;
        case "toId":
          deserialized.to =
            onMissing === "create"
              ? this.getOrCreateIssue(props[typedKey])
              : this.getIssueOrThrow(props[typedKey]);
          break;
        case "createdAt":
          deserialized[typedKey] = props[typedKey];
          break;
        case "updatedAt":
          deserialized[typedKey] = props[typedKey];
          break;
        case "deletedAt":
          deserialized[typedKey] = props[typedKey];
          break;
        default:
          typedKey satisfies never;
      }
    }
    return deserialized;
  }

  serializeRelationProps(props: Partial<RelationPropsRefd>): Partial<RelationProps> {
    const serialized = {} as Partial<RelationProps>;
    for (const key in props) {
      const typedKey = key as keyof RelationPropsRefd;
      if (!props[typedKey]) continue;
      switch (typedKey) {
        case "from":
          serialized.fromId = props[typedKey].id;
          break;
        case "to":
          serialized.toId = props[typedKey].id;
          break;
        case "createdAt":
          serialized.createdAt = props[typedKey];
          break;
        case "updatedAt":
          serialized.updatedAt = props[typedKey];
          break;
        case "deletedAt":
          serialized.deletedAt = props[typedKey];
          break;
        default:
          typedKey satisfies never;
      }
    }
    return serialized;
  }
}

function moveIssueToProject(issue: IssueModel, project: ProjectModel | null) {
  if (issue.project) {
    issue.project._internal.issues.delete(issue);
  }
  issue._internal.props.project = project;
  if (project) {
    project._internal.issues.add(issue);
  }
}

function updateRelationIssues(
  relation: RelationModel,
  { from, to }: { from?: IssueModel; to?: IssueModel }
) {
  if (from !== undefined) {
    const oldFrom = relation._internal.props.from;
    oldFrom._internal.relations.delete(relation);
    relation._internal.props.from = from;
    from._internal.relations.add(relation);
  }
  if (to !== undefined) {
    const oldTo = relation._internal.props.to;
    oldTo._internal.relations.delete(relation);
    relation._internal.props.to = to;
    to._internal.relations.add(relation);
  }
}

abstract class BaseModel {
  abstract id: string;
  abstract store: Store;
  abstract name: ModelName;
}

const IssuePropsRefdSchema = IssueSchema.shape.props.omit({ projectId: true }).extend({
  project: z.custom<ProjectModel | null>(),
});

type IssuePropsRefd = z.infer<typeof IssuePropsRefdSchema>;

class IssueModel implements BaseModel {
  readonly name = "issue";
  store: Store;
  id: string;
  /**
   * Why like this?
   *
   * The _internal is used for anything that is not part of the public interface.
   * These things *are* accessible, but should not be used outside the model.
   *
   * We could make them private, and then expose interfaces to the store to access
   * them as needed, but that's more work than I want right now.
   *
   * We could also just prefix props, relations, and placeholder with an underscore,
   * but I think this is more clear.
   *
   * The proxy around props isn't needed either. Like we could have helper functions
   * for updating them. But I like the readability you get when our other functions
   * just read/write the props directly.
   */
  _internal: {
    props: IssuePropsRefd;
    relations: Set<RelationModel>;
    placeholder: boolean;
  };

  constructor(
    store: Store,
    id: string,
    { state, placeholder = false }: { state: Partial<IssuePropsRefd>; placeholder?: boolean }
  ) {
    this.store = store;
    this.id = id;
    this._internal = {
      props: {
        title: "",
        project: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...state,
      },
      relations: new Set(),
      placeholder,
    };
    moveIssueToProject(this, this._internal.props.project);
  }

  get placeholder() {
    return this._internal.placeholder;
  }

  get project() {
    return this._internal.props.project;
  }

  set project(project: ProjectModel | null) {
    this.store.updateIssue(this.id, { project });
  }

  get relations() {
    return this._internal.relations.values();
  }

  get createdAt() {
    return this._internal.props.createdAt;
  }

  static createPlaceholder(store: Store, id: string) {
    return new IssueModel(store, id, { state: { project: null }, placeholder: true });
  }

  populatePlaceholder(props: Partial<IssuePropsRefd>) {
    if (!this.placeholder) {
      throw new Error("Cannot populate a non-placeholder issue");
    }
    this.store.updateIssue(this.id, props);
    this._internal.placeholder = false;
  }
}

const ProjectPropsRefdSchema = ProjectSchema.shape.props;

type ProjectPropsRefd = z.infer<typeof ProjectPropsRefdSchema>;

class ProjectModel implements BaseModel {
  readonly name = "project";
  store: Store;
  id: string;
  _internal: {
    props: ProjectProps;
    issues: Set<IssueModel>;
    placeholder: boolean;
  };

  constructor(
    store: Store,
    id: string,
    { state, placeholder = false }: { state: Partial<ProjectProps>; placeholder?: boolean }
  ) {
    this.store = store;
    this.id = id;
    this._internal = {
      props: {
        title: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
        ...state,
      },
      issues: new Set<IssueModel>(),
      placeholder,
    };
  }

  get title() {
    return this._internal.props.title;
  }

  set title(value: string) {
    this.store.updateProject(this.id, { title: value });
  }

  get placeholder() {
    return this._internal.placeholder;
  }

  set placeholder(value: boolean) {
    this._internal.placeholder = value;
  }

  static createPlaceholder(store: Store, id: string) {
    return new ProjectModel(store, id, { state: {}, placeholder: true });
  }

  populatePlaceholder(props: Partial<ProjectPropsRefd>) {
    if (!this.placeholder) {
      throw new Error("Cannot populate a non-placeholder project");
    }
    this.store.updateProject(this.id, props);
    this._internal.placeholder = false;
  }

  getIssues(): IterableIterator<IssueModel> {
    return this._internal.issues.values();
  }

  addIssue(issue: IssueModel) {
    this.store.updateIssue(issue.id, { project: this });
  }

  removeIssue(issue: IssueModel) {
    this.store.updateIssue(issue.id, { project: null });
  }
}

const RelationPropsRefdSchema = RelationSchema.shape.props
  .omit({ fromId: true, toId: true })
  .extend({
    from: z.custom<IssueModel>(),
    to: z.custom<IssueModel>(),
  });

type RelationPropsRefd = z.infer<typeof RelationPropsRefdSchema>;

class RelationModel implements BaseModel {
  readonly name = "relation";
  store: Store;
  id: string;
  _internal: {
    props: RelationPropsRefd;
    placeholder: boolean;
  };

  constructor(
    store: Store,
    id: string,
    { state, placeholder = false }: { state: RelationPropsRefd; placeholder?: boolean }
  ) {
    this.store = store;
    this.id = id;
    this._internal = {
      props: { ...state },
      placeholder,
    };
    updateRelationIssues(this, { from: state.from, to: state.to });
  }

  get from(): IssueModel {
    return this._internal.props.from;
  }

  set from(issue: IssueModel) {
    this.store.updateRelation(this.id, { from: issue });
  }

  get to(): IssueModel {
    return this._internal.props.to;
  }

  set to(issue: IssueModel) {
    this.store.updateRelation(this.id, { to: issue });
  }

  get placeholder(): boolean {
    return this._internal.placeholder;
  }

  static createPlaceholder(
    store: Store,
    id: string,
    from: IssueModel,
    to: IssueModel
  ): RelationModel {
    const now = Date.now();
    return new RelationModel(store, id, {
      state: {
        from,
        to,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      placeholder: true,
    });
  }

  populatePlaceholder(data: RelationPropsRefd) {
    if (!this.placeholder) {
      throw new Error("Cannot populate a non-placeholder relation");
    }
    this.store.updateRelation(this.id, data);
    this._internal.placeholder = false;
  }
}

function test() {
  const store = new Store();

  store.load({
    projects: [
      { id: "1", title: "Project 1" },
      { id: "2", title: "Project 2" },
    ],
    issues: [
      { id: "1", projectId: "1", title: "Issue 1", createdAt: 1 },
      { id: "2", projectId: "2", title: "Issue 2", createdAt: 2 },
      { id: "3", projectId: "2", title: "Issue 3", createdAt: 3 },
    ],
    relations: [{ id: "1", fromId: "1", toId: "2", type: "related-to" }],
    views: [{ id: "1", projectId: "1", issueIdToPosition: {} }],
    viewIssuePositions: [],
  });
  const issue1 = store.issues.get("1")!;
  const issue2 = store.issues.get("2")!;
  const issue3 = store.issues.get("3")!;
  const project1 = store.projects.get("1")!;
  const project2 = store.projects.get("2")!;
  const relation1 = store.relations.get("1")!;

  runInAction(() => {
    issue1.project = project2;
    issue2.project = project2;
    project1.title = "Project 1 (updated)";
    project2.removeIssue(issue1);
  });

  runInAction(() => {
    store.createProject("3", { title: "Project 3", placeholder: false });
  });

  runInAction(() => {
    relation1.to = issue3;
    store.createRelation("2", { from: issue1, to: issue3 });
  });
}

test();
