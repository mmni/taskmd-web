import { watch, type FSWatcher } from "node:fs";
import { EventEmitter } from "node:events";
import path from "node:path";

const DEBOUNCE_MS = 150;

export class TaskWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(private scanDir: string) {
    super();
  }

  start(): void {
    if (this.watcher) return;
    try {
      this.watcher = watch(this.scanDir, { recursive: true }, (_event, filename) => {
        if (!filename) return;
        const name = filename.toString();
        if (!name.endsWith(".md")) return;
        // Ignore worklog files — they get written constantly during agent runs
        // and don't affect the task list view.
        if (name.includes(`${path.sep}.worklogs${path.sep}`) || name.includes("/.worklogs/")) return;
        this.scheduleEmit();
      });
    } catch (err) {
      console.error(`Watcher failed to start on ${this.scanDir}:`, err);
    }
  }

  private scheduleEmit(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.emit("change");
      this.debounceTimer = null;
    }, DEBOUNCE_MS);
  }

  stop(): void {
    this.watcher?.close();
    this.watcher = null;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }
}
