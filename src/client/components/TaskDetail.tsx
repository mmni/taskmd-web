import { useEffect, useState } from "react";
import { marked } from "marked";
import type { Task } from "../types.js";
import { fetchTaskContent } from "../api.js";

interface Props {
  task: Task;
  onClose: () => void;
}

export function TaskDetail({ task, onClose }: Props) {
  const [body, setBody] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTaskContent(task.id)
      .then((res) => {
        if (!cancelled) setBody(res.body);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [task.id]);

  // Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const html = body ? (marked.parse(body, { async: false }) as string) : "";

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={`Task ${task.id}`}>
        <header className="modal-header">
          <div className="modal-title">
            <span className="modal-id">{task.id}</span>
            <span className="modal-task-title">{task.title}</span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="close">
            ×
          </button>
        </header>
        <div className="modal-body">
          {error && <div className="error">{error}</div>}
          {!body && !error && <div className="loading">Loading…</div>}
          {body && (
            <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>
      </div>
    </div>
  );
}
