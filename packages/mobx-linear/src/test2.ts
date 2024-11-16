import { generateKeyBetween } from "fractional-indexing";

type ViewData = {
  id: string;
  projectId: string | null;
  issueIdToPosition: Record<string, string>;
};

type ViewState = {
  project: ProjectModel | null; // later this'll be a query
  // The project defines the set of issues (and later the query). This
  // just assigns positions to issues.
};

type ViewIssuePositionData = {
  viewId: string;
  issueId: string;
  position: Position;
};

type Position = string;

function generatePositionBetween(a: Position | null, b: Position | null): Position {
  if (a === null && b === null) {
    return Date.now().toString() + "-" + generateKeyBetween(null, null);
  } else if (a && b) {
    const aParts = a.split("-");
    const bParts = b.split("-");
    if (aParts[0] === bParts[0]) {
      return aParts[0] + "-" + generateKeyBetween(aParts[1], bParts[1]);
    } else {
      return aParts[0] + "-" + generateKeyBetween(aParts[1], null);
    }
  } else if (b && a === null) {
    const datePart = b.split("-")[0];
    return datePart + "-" + generateKeyBetween(null, b);
  } else if (a && b === null) {
    const datePart = a.split("-")[0];
    return datePart + "-" + generateKeyBetween(a, null);
  } else {
    // TODO why can't do this in typescript?
    throw new Error("Invalid arguments to generatePosition");
  }
}

function generatePosition(issue: IssueModel): Position {
  return issue.createdAt.toString() + "-" + generateKeyBetween(null, null);
}

function sortPosition(a: Position, b: Position) {
  return a.localeCompare(b);
}

class ViewModel implements BaseModel {
  readonly name = "view";
  store: Store;
  id: string;
  _state: ViewState;
  issueIdToPosition: Record<string, Position> = {};
  placeholder: boolean;

  constructor(
    store: Store,
    id: string,
    { project = null, placeholder = false }: Partial<ViewState> & { placeholder?: boolean }
  ) {
    this.store = store;
    this.id = id;
    this._state = makeTracking({ project }, this);
    this.placeholder = placeholder;
  }

  setIssuePosition(issue: IssueModel, position: Position) {
    this.store.addChange({
      operation: "set",
      model: "view-issue-position",
      id: this.id + "-" + issue.id,
      oldProps: { viewId: this.id, issueId: issue.id, position: this.issueIdToPosition[issue.id] },
      newProps: { viewId: this.id, issueId: issue.id, position },
    });
    this.issueIdToPosition[issue.id] = position;
  }

  removeIssuePosition(issue: IssueModel) {
    this.store.addChange({
      operation: "delete",
      model: "view-issue-position",
      id: this.id + "-" + issue.id,
      oldProps: { viewId: this.id, issueId: issue.id, position: this.issueIdToPosition[issue.id] },
    });
    delete this.issueIdToPosition[issue.id];
  }

  getPositionedIssues() {
    return Array.from(this._state.project?.getIssues() ?? []).map((issue) => ({
      issue,
      position: this.issueIdToPosition[issue.id] ?? generatePosition(issue),
    }));
  }

  moveIssueAfter(issue: IssueModel, before: IssueModel) {
    const sortedIssues = this.getPositionedIssues().sort((a, b) =>
      sortPosition(a.position, b.position)
    );
    if (
      !sortedIssues.some((v) => v.issue === before) ||
      !sortedIssues.some((v) => v.issue === issue)
    ) {
      throw new Error("Issue not found in view");
    }

    const indexBefore = sortedIssues.findIndex((v) => v.issue === before);
    const indexAfter = indexBefore + 1;
    const beforePositioned = sortedIssues[indexBefore];
    const afterPositioned = sortedIssues[indexAfter];

    this.setIssuePosition(
      issue,
      generatePositionBetween(afterPositioned.position, beforePositioned.position)
    );
    // If either of the issues before/after had ephemeral positions, update them now
    if (!this._state.issueIdToPosition[beforePositioned.issue.id]) {
      this.setIssuePosition(beforePositioned.issue, beforePositioned.position);
    }
    if (!this._state.issueIdToPosition[afterPositioned.issue.id]) {
      this.setIssuePosition(afterPositioned.issue, afterPositioned.position);
    }
  }

  static createPlaceholder(store: Store, id: string) {
    return new ViewModel(store, id, { project: null, placeholder: true });
  }

  populatePlaceholder(props: Partial<ViewState>) {
    if (!this.placeholder) {
      throw new Error("Cannot populate a non-placeholder view");
    }
    Object.assign(this._state, props);
    this.placeholder = false;
  }
}
