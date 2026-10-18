import { useState } from "react";
import { api } from "./api.js";

const TIME_OPTIONS = [
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "4 hours" },
  { value: 360, label: "6 hours" },
];

function AIPanel({ pendingCount }) {
  const [minutes, setMinutes] = useState(120);
  const [summary, setSummary] = useState(null);
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(""); // "summary", "plan" or ""
  const [error, setError] = useState("");

  async function run(kind) {
    setBusy(kind);
    setError("");
    try {
      if (kind === "summary") {
        setSummary(await api("/ai/summary", { method: "POST" }));
      } else {
        setPlan(
          await api("/ai/focus-plan", {
            method: "POST",
            body: JSON.stringify({ minutes: Number(minutes) }),
          })
        );
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }

  const disabled = busy !== "" || pendingCount === 0;

  return (
    <section className="ai-panel">
      <h2>AI Assistant</h2>
      {error && <div className="error">{error}</div>}

      <div className="ai-actions">
        <button className="ai-btn" disabled={disabled} onClick={() => run("summary")}>
          {busy === "summary" ? "Thinking..." : "Analyze my workload"}
        </button>

        <span className="ai-divider" />

        <select value={minutes} onChange={(e) => setMinutes(e.target.value)}>
          {TIME_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button className="ai-btn" disabled={disabled} onClick={() => run("plan")}>
          {busy === "plan" ? "Planning..." : "Build Focus Plan"}
        </button>
      </div>

      {summary && (
        <div className="ai-result">
          <p>{summary.summary}</p>
          <p><strong>Next up:</strong> {summary.next_action}</p>
          <ol>
            {summary.recommended_order.map((t) => (
              <li key={t.id}>
                {t.title} <span className={`badge badge-${t.priority}`}>{t.priority}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {plan && (
        <div className="ai-result">
          <p>
            <strong>Focus Plan:</strong> {plan.minutes_planned} of {plan.minutes_available} minutes planned
          </p>
          <p>{plan.advice}</p>
          {plan.plan.length === 0 ? (
            <p>Nothing fits in that time. Try a longer session or smaller estimates.</p>
          ) : (
            <ol>
              {plan.plan.map((t) => (
                <li key={t.id}>
                  <strong>{t.title}</strong> ({t.estimate_minutes} min)
                  <div className="task-deadline">{t.reason}</div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}

export default AIPanel;