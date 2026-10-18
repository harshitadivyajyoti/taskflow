import { useEffect, useState } from "react";
import { api } from "./api.js";
import AIPanel from "./AIPanel.jsx";

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [deadline, setDeadline] = useState("");
  const [estimate, setEstimate] = useState(30);

  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ title: "", priority: "medium", deadline: "", estimate_minutes: 30 });

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
        body: JSON.stringify({ title, priority, deadline, estimate_minutes: Number(estimate) }),
      });
      setTasks([created, ...tasks]);
      setTitle("");
      setPriority("medium");
      setDeadline("");
      setEstimate(30);
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
    setDraft({
      title: task.title,
      priority: task.priority,
      deadline: task.deadline,
      estimate_minutes: task.estimate_minutes,
    });
  }

  async function saveEdit(id) {
    if (!draft.title.trim()) return;
    try {
      const updated = await api(`/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...draft, estimate_minutes: Number(draft.estimate_minutes) }),
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
  const pendingCount = tasks.filter((t) => !t.completed).length;

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
        <label className="estimate-field">
        Takes   
        <input
          type="number"
          className="estimate-input"
          min="5"
          max="480"
          step="5"
          title="Estimated minutes"
          value={estimate}
          onChange={(e) => setEstimate(e.target.value)}
        />
        min
        </label>
        <button type="submit">Add</button>
      </form>

      <AIPanel pendingCount={pendingCount} />

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
                <label className="estimate-field">
                  Takes
                  <input
                    type="number"
                    className="estimate-input"
                    min="5"
                    max="480"
                    step="5"
                    value={estimate}
                    onChange={(e) => setEstimate(e.target.value)}
                  />
                  min
                </label>
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
                    {task.deadline ? `Due ${task.deadline}` : "No deadline"} · {task.estimate_minutes} min
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