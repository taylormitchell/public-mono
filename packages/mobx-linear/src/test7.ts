type Issue = {
  readonly model: "issue";
  readonly id: string;
  title: string;
  project: Project | null;
};

type Project = {
  readonly model: "project";
  readonly id: string;
  title: string;
  issues: Collection<Issue>;
};

type Collection<T> = {
  get: (key: string) => T | undefined;
  set: (key: string, value: T) => void;
  delete: (key: string) => void;
  keys: () => IterableIterator<string>;
  size: number;
};

class Store {
  issues: Map<string, Issue> = new Map();
  projects: Map<string, Project> = new Map();

  events: any[] = [];
  emitEvent(event: any) {
    this.events.push(event);
  }

  triggersEnabled = true;
  withTriggersDisabled<T>(fn: () => T) {
    const prev = this.triggersEnabled;
    this.triggersEnabled = false;
    const result = fn();
    this.triggersEnabled = prev;
    return result;
  }

  createIssue(props: { id: string; project: Project | null }): Issue {
    const issue: Issue = new Proxy(
      {
        model: "issue",
        id: props.id,
        title: "",
        project: props.project,
      },
      {
        get: (target, prop) => {
          return target[prop as keyof typeof target];
        },
        set: (target, prop, value) => {
          const key = prop as keyof typeof target;
          switch (key) {
            case "title":
              this.emitEvent({
                operation: "update",
                model: "issue",
                id: target.id,
                oldProps: target[key],
                newProps: { title: value },
              });
              target[key] = value;
              return true;
            case "project": {
              this.emitEvent({
                operation: "update",
                model: "issue",
                id: target.id,
                oldProps: { projectId: target.project?.id },
                newProps: { projectId: value?.id },
              });
              const prevProject = target.project;
              Reflect.set(target, key, value);
              if (this.triggersEnabled) {
                this.withTriggersDisabled(() => {
                  if (prevProject) {
                    prevProject.issues.delete(target.id);
                  }
                  if (value) {
                    value.issues.set(target.id, target);
                  }
                });
              }
              return true;
            }
            default:
              return false;
          }
        },
      }
    );
    this.issues.set(props.id, issue);
    return issue;
  }

  createProject(props: { id: string }): Project {
    const project: Project = new Proxy(
      {
        model: "project",
        id: props.id,
        title: "",
        issues: this.createCollection<Issue>({
          setForeignKeyToNull: (issue) => {
            issue.project = null;
          },
          setForeignKeyToThis: (issue) => {
            issue.project = project;
          },
        }),
      },
      {
        get: (target, prop) => {
          return target[prop as keyof typeof target];
        },
        set: (target, prop, value) => {
          const key = prop as keyof typeof target;
          switch (key) {
            case "title":
              this.emitEvent({
                operation: "update",
                model: "project",
                id: target.id,
                oldProps: target[key],
                newProps: { title: value },
              });
              target[key] = value;
              return true;
            case "issues":
              return true;
            default:
              return false;
          }
        },
      }
    );
    this.projects.set(props.id, project);
    return project;
  }

  createCollection<T>({
    setForeignKeyToNull,
    setForeignKeyToThis,
  }: {
    setForeignKeyToNull: (item: T) => void;
    setForeignKeyToThis: (item: T) => void;
  }): Collection<T> {
    const map = new Map<string, T>();
    return {
      get: (key: string) => map.get(key),
      delete: (key: string) => {
        const prev = map.get(key);
        map.delete(key);
        if (this.triggersEnabled) {
          this.withTriggersDisabled(() => {
            if (prev) {
              setForeignKeyToNull(prev);
            }
          });
        }
      },
      set: (key: string, value: T) => {
        const prev = map.get(key);
        map.set(key, value);
        if (this.triggersEnabled) {
          this.withTriggersDisabled(() => {
            if (prev) {
              setForeignKeyToNull(prev);
            }
            if (value) {
              setForeignKeyToThis(value);
            }
          });
        }
      },
      keys: () => map.keys(),
      get size() {
        return map.size;
      },
    };
  }
}

const store = new Store();

const issue = store.createIssue({ id: "issue1", project: null });
const project = store.createProject({ id: "project1" });
const project2 = store.createProject({ id: "project2" });

issue.title = "issue 1";
project.title = "project 1";
issue.project = project;
project.issues.delete("issue1");
console.log("after assigning then deleting");
console.log(project.issues.size);
console.log(issue.project?.id);

issue.project = project2;
console.log("after assigning to another project");
console.log(project2.issues.size);
console.log(issue.project?.id);
