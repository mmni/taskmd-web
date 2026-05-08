export interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  effort: string;
  type: string;
  dependencies: string[];
  tags: string[];
  touches: string[];
  context: string[];
  group: string;
  created_at: string;
  completed_at: string;
  cancelled_at: string;
  file_path: string;
}

export type TagState = "neutral" | "include" | "exclude";

export interface SetFields {
  status?: string;
  priority?: string;
  addTags?: string[];
  removeTags?: string[];
}

export const STATUS_CYCLE = [
  "pending",
  "in-progress",
  "in-review",
  "blocked",
  "completed",
  "cancelled",
] as const;

export const PRIORITY_CYCLE = ["low", "medium", "high", "critical"] as const;

export const PLANNING_PREFIX = "planning:";
export const PLANNING_NONE = "__none__";

export function getPlanningValue(tags: string[]): string | null {
  const found = tags.find((t) => t.startsWith(PLANNING_PREFIX));
  return found ? found.slice(PLANNING_PREFIX.length) : null;
}

export function isPlanningTag(tag: string): boolean {
  return tag.startsWith(PLANNING_PREFIX);
}
