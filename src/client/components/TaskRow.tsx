import { useState } from "react";
import type { Task } from "../types.js";
import { STATUS_CYCLE, PRIORITY_CYCLE } from "../types.js";

interface Props {
  task: Task;
  knownTags: string[];
  onStatusChange: (next: string) => void;
  onPriorityChange: (next: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onTitleClick: () => void;
  busy: boolean;
}

function nextStatus(current: string): string {
  const i = STATUS_CYCLE.indexOf(current as (typeof STATUS_CYCLE)[number]);
  if (i < 0) return STATUS_CYCLE[0];
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
}

function nextPriority(current: string): string {
  const i = PRIORITY_CYCLE.indexOf(current as (typeof PRIORITY_CYCLE)[number]);
  if (i < 0) return PRIORITY_CYCLE[0];
  return PRIORITY_CYCLE[(i + 1) % PRIORITY_CYCLE.length];
}

export function TaskRow({ task, knownTags, onStatusChange, onPriorityChange, onAddTag, onRemoveTag, onTitleClick, busy }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const suggestions = draft
    ? knownTags.filter((t) => t.startsWith(draft) && !task.tags.includes(t)).slice(0, 6)
    : [];

  const submitTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    if (task.tags.includes(tag)) {
      setDraft("");
      setAdding(false);
      return;
    }
    onAddTag(tag);
    setDraft("");
    setAdding(false);
  };

  return (
    <div className={`task-row ${busy ? "busy" : ""}`}>
      <div className="task-id-col">{task.id}</div>
      <div className="task-status-col">
        <button
          className={`status-chip status-${task.status}`}
          onClick={() => onStatusChange(nextStatus(task.status))}
          title="click to cycle status"
          disabled={busy}
        >
          {task.status}
        </button>
        {task.priority && (
          <button
            className={`priority-chip priority-${task.priority}`}
            onClick={() => onPriorityChange(nextPriority(task.priority))}
            title="click to cycle priority"
            disabled={busy}
          >
            {task.priority}
          </button>
        )}
      </div>
      <div className="task-row-content">
      <div className="task-row-title-line">
        <button
          className="task-title"
          onClick={onTitleClick}
          title="open task content"
        >
          {task.title}
        </button>
      </div>
      <div className="task-row-tags">
        {task.tags.map((tag) => (
          <span key={tag} className="tag-chip row">
            {tag}
            <button
              className="tag-remove"
              onClick={() => onRemoveTag(tag)}
              title={`remove ${tag}`}
              disabled={busy}
            >
              ×
            </button>
          </span>
        ))}
        {adding ? (
          <span className="tag-add-input-wrap">
            <input
              autoFocus
              className="tag-add-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitTag(draft);
                else if (e.key === "Escape") {
                  setDraft("");
                  setAdding(false);
                }
              }}
              onBlur={() => {
                if (draft) submitTag(draft);
                else setAdding(false);
              }}
              placeholder="tag…"
            />
            {suggestions.length > 0 && (
              <div className="tag-suggestions">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    className="tag-suggestion"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      submitTag(s);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </span>
        ) : (
          <button className="tag-add-btn" onClick={() => setAdding(true)} disabled={busy}>
            + tag
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
