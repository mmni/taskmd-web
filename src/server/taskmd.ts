import { spawn } from "node:child_process";

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

export interface SetFields {
  status?: string;
  priority?: string;
  addTags?: string[];
  removeTags?: string[];
}

const SPAWN_TIMEOUT_MS = 10_000;

function runTaskmd(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("taskmd", args, { cwd });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`taskmd ${args.join(" ")} timed out after ${SPAWN_TIMEOUT_MS}ms`));
    }, SPAWN_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`taskmd ${args.join(" ")} exited ${code}: ${stderr.trim()}`));
    });
  });
}

export async function listTasks(scanDir: string): Promise<Task[]> {
  const json = await runTaskmd(["list", "--format", "json", "-d", scanDir], scanDir);
  const trimmed = json.trim();
  if (!trimmed) return [];
  return JSON.parse(trimmed) as Task[];
}

export async function setTask(scanDir: string, id: string, fields: SetFields): Promise<void> {
  const args = ["set", id];
  if (fields.status) args.push("--status", fields.status);
  if (fields.priority) args.push("--priority", fields.priority);
  for (const tag of fields.addTags ?? []) args.push("--add-tag", tag);
  for (const tag of fields.removeTags ?? []) args.push("--remove-tag", tag);
  args.push("-d", scanDir);
  await runTaskmd(args, scanDir);
}
