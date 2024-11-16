import { useState, useCallback, useEffect } from "react";
import { Todo } from "@common/todo/types";
import {
  useTodos,
  groupTodosByDueDate,
  groupTodosByFilename,
  extractFilenameKeywords,
} from "./todoUtils";

const apiUrl = import.meta.env.VITE_API_URL;

export function TodosPage({ jwt }: { jwt: string | null }) {
  const { todos, refetch } = useTodos(jwt);
  const [filter, setFilter] = useState<"all" | "today">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [groupby, setGroupby] = useState<"byFile" | "byDueDate">("byDueDate");
  const [showCompleted, setShowCompleted] = useState(false);
  const [showNewTodoModal, setShowNewTodoModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = useCallback(async () => {
    if (!jwt) return;
    setIsSyncing(true);
    try {
      const response = await fetch(`${apiUrl}/api/git/rebase`, {
        method: "GET",
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (response.ok) {
        const result = await response.json();
        console.log("Sync successful:", result.message);
        refetch(jwt);
      } else {
        console.error("Sync failed");
      }
    } catch (error) {
      console.error("Error during sync:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [jwt, refetch]);

  // Apply filters
  const filteredTodos = todos.filter((todo) => {
    if (filter === "today" && todo.due?.toDateString() !== new Date().toDateString()) {
      return false;
    }
    if (!showCompleted && todo.status === "DONE") {
      return false;
    }
    if (searchTerm) {
      const searchText =
        todo.text + " " + extractFilenameKeywords(todo.relativeFilename || "").join(" ");
      if (!searchText.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  const handleSaveNewTodo = async (todo: Todo) => {
    const res = await fetch(`${apiUrl}/api/todo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(todo),
    });

    if (res.ok) {
      refetch(jwt);
    } else {
      console.error("Failed to save new todo");
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <input
          type="text"
          placeholder="Search todos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={groupby}
          onChange={(e) => setGroupby(e.target.value as "byFile" | "byDueDate")}
          className="view-dropdown"
        >
          <option value="byFile">Group by File</option>
          <option value="byDueDate">Group by Due Date</option>
        </select>
        <label className="show-completed-checkbox">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
          />
          Show Completed
        </label>
        <label>
          <input
            type="checkbox"
            checked={filter === "today"}
            onChange={(e) => setFilter(e.target.checked ? "today" : "all")}
          />
          Today only
        </label>
        <button onClick={() => setShowNewTodoModal(true)} className="new-todo-button">
          New Todo
        </button>
        <button onClick={handleSync} disabled={isSyncing} className="sync-button">
          {isSyncing ? "Syncing..." : "Sync"}
        </button>
      </header>
      <div className="todo-list">
        {groupby === "byFile" ? (
          <div>
            {Object.entries(groupTodosByFilename(filteredTodos)).map(([filename, fileTodos]) => (
              <div key={filename} className="file-group">
                <h2>{filename}</h2>
                <TodoList todos={fileTodos} />
              </div>
            ))}
          </div>
        ) : (
          <div>
            {Object.entries(groupTodosByDueDate(filteredTodos)).map(([dueDate, dateTodos]) => (
              <div key={dueDate} className="date-group">
                <h2>{dueDate}</h2>
                <TodoList todos={dateTodos} />
              </div>
            ))}
          </div>
        )}
      </div>
      <NewTodoModal
        isOpen={showNewTodoModal}
        onClose={() => setShowNewTodoModal(false)}
        onSave={handleSaveNewTodo}
      />
    </div>
  );
}

function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <div className="todo-list">
      {todos.map((todo) => (
        <div key={todo.id || todo.text} className="todo-item">
          <div className="todo-content">
            <input
              type="checkbox"
              checked={todo.status === "DONE"}
              className="todo-checkbox"
              onChange={() => {}}
            />
            <span className="todo-text">{todo.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function NewTodoModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (todo: Todo) => void;
}) {
  const [todo, setTodo] = useState<Todo>({ type: "todo", text: "", status: "TODO" });

  const handleSave = () => {
    onSave(todo);
    setTodo({ type: "todo", text: "", status: "TODO" });
    onClose();
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>New Todo</h2>
        <input
          type="text"
          placeholder="Todo text"
          value={todo.text}
          onChange={(e) => setTodo({ ...todo, text: e.target.value })}
        />
        <input
          type="date"
          value={todo.due?.toISOString().split("T")[0]}
          onChange={(e) => setTodo({ ...todo, due: new Date(e.target.value) })}
        />
        <div className="modal-buttons">
          <button onClick={handleSave}>Save</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
