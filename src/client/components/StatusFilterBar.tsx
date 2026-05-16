import type { TagState } from "../types.js";

interface Props {
  values: { value: string; count: number }[];
  state: Record<string, TagState>;
  onCycle: (value: string) => void;
  onClear: () => void;
}

function expression(state: Record<string, TagState>): string {
  const includes = Object.entries(state)
    .filter(([, s]) => s === "include")
    .map(([v]) => v);
  const excludes = Object.entries(state)
    .filter(([, s]) => s === "exclude")
    .map(([v]) => v);
  const parts: string[] = [];
  if (includes.length) parts.push(includes.map((v) => `status:${v}`).join(" OR "));
  if (excludes.length) parts.push(excludes.map((v) => `NOT status:${v}`).join(" AND "));
  return parts.join(" AND ");
}

export function StatusFilterBar({ values, state, onCycle, onClear }: Props) {
  const expr = expression(state);
  const anyActive = Object.values(state).some((s) => s !== "neutral");
  if (values.length === 0) return null;
  return (
    <div className="tag-filter-bar status-filter-bar">
      <div className="tag-filter-header">
        <span className="tag-filter-label">status</span>
        <span className="tag-filter-expr">{expr || <em>no status filter</em>}</span>
        {anyActive && (
          <button className="tag-filter-clear" onClick={onClear}>
            clear
          </button>
        )}
      </div>
      <div className="tag-filter-chips">
        {values.map(({ value, count }) => {
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
              {value} <span className="count">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
