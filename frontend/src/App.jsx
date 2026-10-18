import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// One helper for every request, so error handling lives in one place
async function api(path, options = {}) {
  const res = await fetch(`${API_URL}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : "Request failed");
  }
  return res.status === 204 ? null : res.json();
}

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  // Add-form fields
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [deadline, setDeadline] = useState("");

  // Edit state: which task is being edited, and its draft values
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ title: "", priority: "medium", deadline: "" });

  // Load tasks once when the page opens
  useEffect(() => {
    async function load() {
      try {
        setTasks(await api("/tasks"));
      } catch (e) {
        setError("Could not load tasks. Is the backend running? " + e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleAddTask(event) {
    event.preventDefault();
    if (!title.trim()) return;
    try {
      const created = await api("/tasks", {
        method: "POST",
        body: JSON.stringify({ title, priority, deadline }),
      });
      setTasks([created, ...tasks]);
      setTitle("");
      setPriority("medium");
      setDeadline("");
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }

  async function toggleComplete(task) {
    try {
      const updated = await api(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !task.completed }),
      });
      setTasks(tasks.map((t) => (t.id === task.id ? updated : t)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteTask(id) {
    try {
      await api(`/tasks/${id}`, { method: "DELETE" });
      setTasks(tasks.filter((t) => t.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  function startEdit(task) {
    setEditingId(task.id);
    setDraft({ title: task.title, priority: task.priority, deadline: task.deadline });
  }

  async function saveEdit(id) {
    if (!draft.title.trim()) return;
    try {
      const updated = await api(`/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(draft),
      });
      setTasks(tasks.map((t) => (t.id === id ? updated : t)));
      setEditingId(null);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }

  const visibleTasks = tasks.filter((t) => {
    if (filter === "pending") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  return (
    <main className="app">
      <h1>TaskFlow</h1>
      <p className="tagline">Your tasks, planned by AI.</p>

      {error && <div className="error">{error}</div>}

      <form className="task-form" onSubmit={handleAddTask}>
        <input
          type="text"
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        <button type="submit">Add</button>
      </form>

      <div className="filters">
        {["all", "pending", "completed"].map((f) => (
          <button
            key={f}
            className={filter === f ? "filter active" : "filter"}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {loading && <p className="tagline">Loading tasks...</p>}
      {!loading && visibleTasks.length === 0 && (
        <p className="tagline">
          {tasks.length === 0 ? "No tasks yet. Add your first one above." : `No ${filter} tasks.`}
        </p>
      )}

      <ul className="task-list">
        {visibleTasks.map((task) => (
          <li key={task.id} className={task.completed ? "task done" : "task"}>
            {editingId === task.id ? (
              <div className="edit-row">
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
                <select
                  value={draft.priority}
                  onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <input
                  type="date"
                  value={draft.deadline}
                  onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
                />
                <button className="btn-small primary" onClick={() => saveEdit(task.id)}>Save</button>
                <button className="btn-small" onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            ) : (
              <>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleComplete(task)}
                />
                <div className="task-main">
                  <div className="task-title">{task.title}</div>
                  <div className="task-deadline">
                    {task.deadline ? `Due ${task.deadline}` : "No deadline"}
                  </div>
                </div>
                <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                <button className="btn-small" onClick={() => startEdit(task)}>Edit</button>
                <button className="btn-small danger" onClick={() => deleteTask(task.id)}>Delete</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

export default App;