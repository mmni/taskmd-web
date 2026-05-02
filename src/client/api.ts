import type { Task, SetFields } from "./types.js";

export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch("/api/tasks");
  if (!res.ok) throw new Error(`GET /api/tasks failed: ${res.status}`);
  const body = (await res.json()) as { tasks: Task[]; fetchedAt: number };
  return body.tasks;
}

export async function patchTask(id: string, fields: SetFields): Promise<Task | null> {
  const res = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH /api/tasks/${id} failed: ${res.status} ${text}`);
  }
  const body = (await res.json()) as { task: Task | null };
  return body.task;
}

export async function fetchTaskContent(id: string): Promise<{ body: string; file_path: string }> {
  const res = await fetch(`/api/tasks/${encodeURIComponent(id)}/content`);
  if (!res.ok) throw new Error(`GET /api/tasks/${id}/content failed: ${res.status}`);
  return (await res.json()) as { body: string; file_path: string };
}

export function subscribeTaskChanges(onChange: () => void): () => void {
  const source = new EventSource("/api/events");
  source.addEventListener("tasks-changed", onChange);
  source.addEventListener("error", () => {
    // EventSource auto-reconnects; nothing to do.
  });
  return () => source.close();
}
