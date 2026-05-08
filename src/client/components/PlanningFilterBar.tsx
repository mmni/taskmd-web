import type { TagState } from "../types.js";
import { PLANNING_NONE } from "../types.js";

interface Props {
  values: { value: string; count: number }[];
  noneCount: number;
  state: Record<string, TagState>;
  onCycle: (value: string) => void;
  onClear: () => void;
}

function label(v: string): string {
  return v === PLANNING_NONE ? "(none)" : `planning:${v}`;
}

function expression(state: Record<string, TagState>): string {
  const includes = Object.entries(state)
    .filter(([, s]) => s === "include")
    .map(([v]) => v);
  const excludes = Object.entries(state)
    .filter(([, s]) => s === "exclude")
    .map(([v]) => v);
  const parts: string[] = [];
  if (includes.length) parts.push(includes.map(label).join(" OR "));
  if (excludes.length) parts.push(excludes.map((v) => `NOT ${label(v)}`).join(" AND "));
  return parts.join(" AND ");
}

export function PlanningFilterBar({ values, noneCount, state, onCycle, onClear }: Props) {
  const expr = expression(state);
  const anyActive = Object.values(state).some((s) => s !== "neutral");
  if (values.length === 0 && noneCount === 0) return null;
  const chips: { value: string; count: number; label: string }[] = [];
  if (noneCount > 0) chips.push({ value: PLANNING_NONE, count: noneCount, label: "(none)" });
  for (const v of values) chips.push({ value: v.value, count: v.count, label: v.value });
  return (
    <div className="tag-filter-bar planning-filter-bar">
      <div className="tag-filter-header">
        <span className="tag-filter-label">planning</span>
        <span className="tag-filter-expr">{expr || <em>no planning filter</em>}</span>
        {anyActive && (
          <button className="tag-filter-clear" onClick={onClear}>
            clear
          </button>
        )}
      </div>
      <div className="tag-filter-chips">
        {chips.map(({ value, count, label }) => {
          const s = state[value] ?? "neutral";
          return (
            <button
              key={value}
              className={`tag-chip filter ${s}`}
              onClick={() => onCycle(value)}
              title={
                s === "neutral" ? "click to require"
                : s === "include" ? "click to exclude"
                : "click to clear"
              }
            >
              <span className="tag-chip-marker">
                {s === "include" ? "+" : s === "exclude" ? "−" : ""}
              </span>
              {label} <span className="count">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
