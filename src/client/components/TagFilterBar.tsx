import { useState } from "react";
import type { TagState } from "../types.js";

interface Props {
  tags: { tag: string; count: number }[];
  state: Record<string, TagState>;
  onCycle: (tag: string) => void;
  onClear: () => void;
}

function expression(state: Record<string, TagState>): string {
  const includes = Object.entries(state)
    .filter(([, s]) => s === "include")
    .map(([t]) => t);
  const excludes = Object.entries(state)
    .filter(([, s]) => s === "exclude")
    .map(([t]) => t);
  const parts: string[] = [];
  if (includes.length) parts.push(includes.join(" AND "));
  if (excludes.length) parts.push(excludes.map((t) => `NOT ${t}`).join(" AND "));
  return parts.join(" AND ");
}

export function TagFilterBar({ tags, state, onCycle, onClear }: Props) {
  const [collapsed, setCollapsed] = useState(true);
  const expr = expression(state);
  const anyActive = Object.values(state).some((s) => s !== "neutral");
  return (
    <div className="tag-filter-bar">
      <div className="tag-filter-header">
        <button
          className="tag-filter-toggle"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "show all tags" : "hide tag list"}
          aria-expanded={!collapsed}
        >
          {collapsed ? "▸" : "▾"}
        </button>
        <span className="tag-filter-label">tags</span>
        <span className="tag-filter-expr">{expr || <em>no tag filter</em>}</span>
        {anyActive && (
          <button className="tag-filter-clear" onClick={onClear}>
            clear
          </button>
        )}
      </div>
      {!collapsed && (
        <div className="tag-filter-chips">
          {tags.map(({ tag, count }) => {
            const s = state[tag] ?? "neutral";
            return (
              <button
                key={tag}
                className={`tag-chip filter ${s}`}
                onClick={() => onCycle(tag)}
                title={
                  s === "neutral" ? "click to require"
                  : s === "include" ? "click to exclude"
                  : "click to clear"
                }
              >
                <span className="tag-chip-marker">
                  {s === "include" ? "+" : s === "exclude" ? "−" : ""}
                </span>
                {tag} <span className="count">{count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
