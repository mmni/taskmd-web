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
