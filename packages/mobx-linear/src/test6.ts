import { autorun, observable, runInAction, when } from "mobx";

const issue = observable.object({
  id: "issue1",
  title: "issue",
  project: null,
}) as { id: string; title: string; project: typeof project | null };

const project = observable.object({
  id: "project1",
  title: "project",
  issues: new Map<string, typeof issue>(),
}) as { id: string; title: string; issues: Map<string, typeof issue> };

when(
  () =>
    (issue.project && !project.issues.has(issue.id)) ||
    (!issue.project && project.issues.has(issue.id)),
  () => {
    console.log("when");
    if (issue.project && !project.issues.has(issue.id)) {
      project.issues.set(issue.id, issue);
    } else if (!issue.project && project.issues.has(issue.id)) {
      project.issues.delete(issue.id);
    }
  }
);

autorun(() => {
  console.log("autorun");
  console.log(Array.from(project.issues.values()).map((i) => i.id));
  console.log(issue.project?.title);
});

runInAction(() => {
  console.log("adding issue");
  project.issues.set(issue.id, issue);
});

// runInAction(() => {
//   console.log("deleting issue");
//   project.issues.delete(issue.id);
// });
