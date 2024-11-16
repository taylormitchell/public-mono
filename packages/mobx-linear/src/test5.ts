import { autorun, observable, runInAction } from "mobx";

class Collection<T> {
  private set = observable.set<T>();
  private refKey: keyof T;
  private parent: any;
  constructor(parent: any, refKey: keyof T) {
    this.parent = parent;
    this.refKey = refKey;
  }

  add(item: T) {
    this.set.add(item);
    if (item[this.refKey] !== this.parent) {
      item[this.refKey] = this.parent;
    }
  }

  delete(item: T) {
    if (this.set.delete(item)) {
      item[this.refKey] = null;
    }
  }

  has(item: T) {
    return this.set.has(item);
  }

  values() {
    return this.set.values();
  }
}

const issue = observable.object({
  id: "issue1",
  title: "issue",
  project: null,
}) as { id: string; title: string; project: typeof project | null };

const project = observable.object({
  id: "project1",
  title: "project",
  issues: new Collection<typeof issue>(project, "project"),
}) as { id: string; title: string; issues: Collection<typeof issue> };

autorun(() => {
  console.log("autorun");
  console.log(Array.from(project.issues.values()).map((i) => i.id));
  console.log(issue.project?.title);
});

runInAction(() => {
  console.log("adding issue");
  project.issues.add(issue);
});

// runInAction(() => {
//   console.log("deleting issue");
//   project.issues.delete(issue.id);
// });
