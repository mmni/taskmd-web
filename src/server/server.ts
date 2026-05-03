import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { streamSSE } from "hono/streaming";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Strip a leading YAML frontmatter block (between two `---` lines) and return
// the body. If no frontmatter is present, returns the input unchanged.
function stripFrontmatter(raw: string): string {
  if (!raw.startsWith("---")) return raw;
  const lines = raw.split("\n");
  // Find the closing `---` after line 0.
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      return lines.slice(i + 1).join("\n").replace(/^\n+/, "");
    }
  }
  return raw;
}
import { fileURLToPath } from "node:url";
import { listTasks, setTask, archiveAll, type Task, type SetFields, type ArchiveScope } from "./taskmd.js";
import { TaskWatcher } from "./watcher.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = path.resolve(__dirname, "../client");

interface Cache {
  tasks: Task[] | null;
  fetchedAt: number;
}

export interface ServerOptions {
  scanDir: string;
  port: number;
}

export async function startServer(opts: ServerOptions): Promise<{ url: string }> {
  const { scanDir, port } = opts;

  const cache: Cache = { tasks: null, fetchedAt: 0 };
  const watcher = new TaskWatcher(scanDir);
  watcher.start();
  watcher.on("change", () => {
    cache.tasks = null;
  });

  async function getTasks(): Promise<Task[]> {
    if (cache.tasks) return cache.tasks;
    const raw = await listTasks(scanDir);
    // v1: hide archived tasks and any non-task markdown the scanner picked up
    // (review docs without status/tags slip through). Real tasks always have
    // an id, a status, and a tags array.
    const tasks = raw.filter(
      (t) => t.id && t.status && Array.isArray(t.tags) && t.group !== "archive"
    );
    cache.tasks = tasks;
    cache.fetchedAt = Date.now();
    return tasks;
  }

  const app = new Hono();

  app.get("/api/health", (c) => c.json({ ok: true, scanDir }));

  app.get("/api/tasks", async (c) => {
    try {
      const tasks = await getTasks();
      return c.json({ tasks, fetchedAt: cache.fetchedAt });
    } catch (err) {
      return c.json({ error: String(err) }, 500);
    }
  });

  app.get("/api/tasks/:id/content", async (c) => {
    const id = c.req.param("id");
    try {
      const tasks = await getTasks();
      const task = tasks.find((t) => t.id === id);
      if (!task) return c.json({ error: "task not found" }, 404);
      // file_path is taskmd's relative path under scanDir. Resolve and confirm
      // the result still sits inside scanDir before reading — defends against
      // any unexpected `..` segments.
      const abs = path.resolve(scanDir, task.file_path);
      if (!abs.startsWith(path.resolve(scanDir) + path.sep)) {
        return c.json({ error: "invalid path" }, 400);
      }
      const raw = await readFile(abs, "utf8");
      return c.json({ body: stripFrontmatter(raw), file_path: task.file_path });
    } catch (err) {
      return c.json({ error: String(err) }, 500);
    }
  });

  app.post("/api/archive", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { scope?: ArchiveScope };
    if (body.scope !== "completed" && body.scope !== "cancelled") {
      return c.json({ error: "scope must be 'completed' or 'cancelled'" }, 400);
    }
    try {
      const before = (await getTasks()).filter((t) => t.status === body.scope).length;
      await archiveAll(scanDir, body.scope);
      cache.tasks = null;
      return c.json({ archived: before });
    } catch (err) {
      return c.json({ error: String(err) }, 500);
    }
  });

  app.patch("/api/tasks/:id", async (c) => {
    const id = c.req.param("id");
    const body = (await c.req.json().catch(() => ({}))) as SetFields;
    try {
      await setTask(scanDir, id, body);
      cache.tasks = null;
      const tasks = await getTasks();
      const updated = tasks.find((t) => t.id === id);
      return c.json({ task: updated ?? null });
    } catch (err) {
      return c.json({ error: String(err) }, 500);
    }
  });

  app.get("/api/events", (c) => {
    return streamSSE(c, async (stream) => {
      const onChange = async () => {
        await stream.writeSSE({ event: "tasks-changed", data: String(Date.now()) });
      };
      watcher.on("change", onChange);
      // Heartbeat keeps proxies from closing the connection.
      const heartbeat = setInterval(() => {
        stream.writeSSE({ event: "ping", data: String(Date.now()) }).catch(() => {});
      }, 25_000);
      try {
        await stream.writeSSE({ event: "ready", data: "1" });
        // Hold the stream open until the client disconnects.
        await new Promise<void>((resolve) => stream.onAbort(resolve));
      } finally {
        clearInterval(heartbeat);
        watcher.off("change", onChange);
      }
    });
  });

  // Static SPA — serve built assets from dist/client.
  app.use("/assets/*", serveStatic({ root: path.relative(process.cwd(), CLIENT_DIR) }));

  // SPA fallback: serve index.html for non-API GETs.
  app.get("*", async (c) => {
    try {
      const html = await readFile(path.join(CLIENT_DIR, "index.html"), "utf8");
      return c.html(html);
    } catch {
      return c.text("taskmd-web client not built. Run `pnpm build` first.", 500);
    }
  });

  const url = `http://localhost:${port}`;
  await new Promise<void>((resolve, reject) => {
    const server = serve({ fetch: app.fetch, port }, () => resolve());
    server.on("error", reject);
  });

  return { url };
}
