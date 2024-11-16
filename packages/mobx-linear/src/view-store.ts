import { makeAutoObservable } from "mobx";
import { IssueModel } from "./state";

export type ModalType = "issue" | "project" | null;

export class ViewStore {
  currentModal: ModalType = null;
  editingIssue: IssueModel | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  openModal(type: ModalType, issue?: IssueModel) {
    this.currentModal = type;
    if (type === "issue" && issue) {
      this.editingIssue = issue;
    }
  }

  closeModal() {
    this.currentModal = null;
    this.editingIssue = null;
  }
}
