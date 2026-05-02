import { startServer } from "./server.js";
import { spawn } from "node:child_process";
import { statSync } from "node:fs";
import path from "node:path";

const DEFAULT_PORT = 7878;

function resolveScanDir(input: string): string {
  const abs = path.resolve(input);
  // Convention: prefer a `tasks/` subdir if present — matches taskmd's standard
  // layout and avoids picking up review docs / archives sitting alongside it.
  const tasksSub = path.join(abs, "tasks");
  try {
    if (statSync(tasksSub).isDirectory()) return tasksSub;
  } catch {
    // tasks/ doesn't exist; fall through to the input dir.
  }
  return abs;
}

interface ParsedArgs {
  command: string;
  port: number;
  scanDir: string;
  open: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  if (args[0] === "--help" || args[0] === "-h") {
    printHelp();
    process.exit(0);
  }
  // Treat the first non-flag token as the command; default to "start".
  const command = args[0] && !args[0].startsWith("-") ? args[0] : "start";
  const flagStart = args[0] && !args[0].startsWith("-") ? 1 : 0;
  let port = DEFAULT_PORT;
  let scanDir = resolveScanDir(process.cwd());
  let open = true;

  for (let i = flagStart; i < args.length; i++) {
    const a = args[i];
    if (a === "--port" || a === "-p") {
      const v = args[++i];
      if (!v) throw new Error("--port requires a value");
      port = Number(v);
      if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        throw new Error(`invalid port: ${v}`);
      }
    } else if (a === "--dir" || a === "-d") {
      const v = args[++i];
      if (!v) throw new Error("--dir requires a value");
      scanDir = resolveScanDir(v);
    } else if (a === "--no-open") {
      open = false;
    } else if (a === "--open") {
      open = true;
    } else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${a}`);
    }
  }

  return { command, port, scanDir, open };
}

function printHelp(): void {
  console.log(`taskmd-web — local web UI for taskmd repos

Usage:
  taskmd-web start [--port 7878] [--dir <path>] [--no-open]
  taskmd-web --help

Flags:
  --port, -p   port to listen on (default 7878)
  --dir, -d    scan directory (default current working directory)
  --no-open    do not open the browser on start
`);
}

function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin" ? "open" :
    process.platform === "win32" ? "cmd" :
    "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", url] : [url];
  const child = spawn(cmd, args, { stdio: "ignore", detached: true });
  child.on("error", () => {});
  child.unref();
}

async function main(): Promise<void> {
  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(process.argv);
  } catch (err) {
    console.error(String(err));
    printHelp();
    process.exit(2);
  }

  if (parsed.command !== "start") {
    console.error(`unknown command: ${parsed.command}`);
    printHelp();
    process.exit(2);
  }

  const { url } = await startServer({ scanDir: parsed.scanDir, port: parsed.port });
  console.log(`taskmd-web listening on ${url}`);
  console.log(`scanning: ${parsed.scanDir}`);
  if (parsed.open) openBrowser(url);
}

main().catch((err) => {
  console.error("taskmd-web failed:", err);
  process.exit(1);
});
