import { useCallback, useState } from "react";
import { observer } from "mobx-react-lite";
import { action } from "mobx";
import {
  Calendar,
  Clock,
  MoreHorizontal,
  Folder,
  Bell,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { Store, IssueModel } from "./state";
import { ViewStore } from "./view-store";
import { useEffect } from "react";

const store = new Store();
const viewStore = new ViewStore();

const App = () => {
  return <IssuesView />;
};

function noMod(e: KeyboardEvent) {
  return !e.metaKey && !e.altKey && !e.ctrlKey;
}

// Main Issues List View Component
const IssuesView = observer(() => {
  const [filter, setFilter] = useState<{ projectId?: string; search?: string }>({});
  const issues = Array.from(store.issues.values());

  const filteredIssues = issues.filter((issue) => {
    if (filter.projectId !== undefined && issue.project?.id !== filter.projectId) return false;
    if (filter.search && !issue.title.includes(filter.search)) return false;
    return true;
  });

  const handleCreateIssue = useCallback(
    action(() => {
      const issue = store.createIssue({ title: "" });
      viewStore.openModal("issue", issue);
    }),
    [viewStore]
  );

  // Add escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        viewStore.closeModal();
      }
      if (viewStore.currentModal === null && noMod(e) && e.key === "c") {
        e.preventDefault();
        e.stopPropagation();
        handleCreateIssue();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [handleCreateIssue]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-semibold">Issues</h1>
            <button
              onClick={() => viewStore.openModal("project")}
              className="text-gray-500 hover:text-gray-700"
            >
              <Folder size={20} />
            </button>
            <button className="text-gray-500 hover:text-gray-700">
              <MoreHorizontal size={20} />
            </button>
            <input
              type="text"
              placeholder="Search"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            />
            <select
              onChange={(e) => {
                const projectId = e.target.value || undefined;
                setFilter({ projectId });
              }}
              value={filter?.projectId ?? ""}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              <option value="">All Projects</option>
              {Array.from(store.projects.values()).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
            k{" "}
          </div>
          <button
            onClick={handleCreateIssue}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            New Issue
          </button>
        </div>

        {/* Issues List */}
        <div className="bg-white rounded-lg shadow">
          {filteredIssues.map((issue) => (
            <IssueListItem
              key={issue.id}
              issue={issue}
              onSelect={() => viewStore.openModal("issue", issue)}
            />
          ))}
        </div>
      </div>

      {/* Modals */}
      {viewStore.currentModal === "issue" && viewStore.editingIssue && (
        <IssueEditorModal issue={viewStore.editingIssue} onClose={() => viewStore.closeModal()} />
      )}

      {viewStore.currentModal === "project" && (
        <ProjectCreationModal onClose={() => viewStore.closeModal()} />
      )}
    </div>
  );
});

// Individual Issue List Item Component
const IssueListItem = observer(
  ({ issue, onSelect }: { issue: IssueModel; onSelect: () => void }) => {
    return (
      <div
        onClick={onSelect}
        className="flex items-center px-4 py-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
      >
        <div className="flex items-center flex-1">
          <CheckCircle2 className="text-gray-400 mr-3" size={18} />
          <span className="text-gray-900">{issue.title || "Untitled Issue"}</span>
        </div>

        <div className="flex items-center space-x-4 text-gray-500">
          <span className="text-sm">#{issue.id.slice(0, 4)}</span>
          <span className="text-sm">{new Date(issue.createdAt).toLocaleDateString()}</span>
          {issue.project && <span className="text-sm text-gray-600">{issue.project.title}</span>}
        </div>
      </div>
    );
  }
);

// Issue Editor Modal Component
const IssueEditorModal = observer(
  ({ issue, onClose }: { issue: IssueModel; onClose: () => void }) => {
    const [isProjectSelectOpen, setIsProjectSelectOpen] = useState(false);
    const projects = Array.from(store.projects.values());

    // Add keyboard handler
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          onClose();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="flex justify-between items-center p-4 border-b">
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">ENT-{issue.id.slice(0, 4)}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">{issue.project?.title || "No Project"}</span>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6">
            <input
              autoFocus
              type="text"
              value={issue.title}
              onChange={action((e) => {
                issue.title = e.target.value;
              })}
              placeholder="Issue title"
              className="w-full text-xl font-medium border-none focus:outline-none focus:ring-0 mb-4"
            />

            {/* Action Buttons */}
            <div className="flex space-x-2 mb-6">
              <div className="relative">
                <button
                  onClick={() => setIsProjectSelectOpen(!isProjectSelectOpen)}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded border hover:bg-gray-50"
                >
                  <Folder size={16} />
                  <span>{issue.project?.title || "Project"}</span>
                </button>

                {isProjectSelectOpen && (
                  <div className="absolute z-10 mt-1 w-48 bg-white rounded-md shadow-lg border">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        onClick={action(() => {
                          issue.project = project;
                          setIsProjectSelectOpen(false);
                        })}
                        className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        {project.title}
                      </div>
                    ))}
                    {issue.project && (
                      <div
                        onClick={action(() => {
                          issue.project = null;
                          setIsProjectSelectOpen(false);
                        })}
                        className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-red-600 border-t"
                      >
                        Remove Project
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button className="flex items-center space-x-1 px-3 py-1.5 rounded border hover:bg-gray-50">
                <Calendar size={16} />
                <span>Due Date</span>
              </button>
            </div>

            {/* Description */}
            <textarea
              placeholder="Add description..."
              className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-1 focus:ring-indigo-500"
            />

            {/* Footer */}
            <div className="flex justify-between items-center mt-6">
              <div className="flex space-x-4">
                <button className="text-gray-500 hover:text-gray-700">
                  <MessageSquare size={20} />
                </button>
                <button className="text-gray-500 hover:text-gray-700">
                  <Bell size={20} />
                </button>
                <button className="text-gray-500 hover:text-gray-700">
                  <Clock size={20} />
                </button>
              </div>
              <button
                onClick={action(() => {
                  issue.delete();
                  onClose();
                })}
                className="text-red-600 hover:text-red-700"
              >
                Delete Issue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

// Add this new component at the end before the export
const ProjectCreationModal = observer(({ onClose }: { onClose: () => void }) => {
  const [title, setTitle] = useState("");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Create Project</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Project name"
          className="w-full p-2 border rounded-md mb-4 focus:ring-1 focus:ring-indigo-500"
        />

        <div className="flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-700">
            Cancel
          </button>
          <button
            onClick={action(() => {
              if (title.trim()) {
                store.createProject({ title: title.trim() });
                onClose();
              }
            })}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
});

export default App;
