# taskmd-web

A small local web UI for [taskmd](https://github.com/driangle/taskmd) repositories.
It runs on your machine, scans the `tasks/` directory in your project, and gives
you a filterable view with quick status / tag editing.

This is a third-party overlay — it never modifies the upstream `taskmd` project
or its file format. It only shells out to `taskmd list` and `taskmd set`, so any
changes you make are written back through the official CLI.

## Why this exists

Upstream taskmd already ships a great web dashboard. This project exists for one
specific workflow:

- **Combined tag filtering** — require multiple tags at once (`A AND B AND C`).
- **Negative tag filtering** — exclude tasks with a given tag (`NOT A`).
- **Group switching** — quickly flip between top-level groups under `tasks/`
  (e.g. `app`, `web`, `cross`, `marketing`).

If you don't need those, the upstream `taskmd web` command is probably a better
fit.

## Features (v1)

- List tasks from a `tasks/` directory.
- Filter by group, by required tags (AND), and by excluded tags (NOT).
- Inline edit: cycle status, add/remove tags from each row.
- Click a task title to read the rendered markdown body in a modal.
- Live refresh — edits made in your editor or via the CLI show up automatically.
- Light / dark theme toggle.

## Requirements

- **Node 20 or newer**
- **`taskmd` CLI on your PATH** ([install instructions](https://github.com/driangle/taskmd))
- **`pnpm`** for installation (`npm install -g pnpm` if you don't have it)

## Install

```sh
git clone <this-repo-url>
cd taskmd-web
pnpm install
pnpm build
npm link
```

`npm link` registers the `taskmd-web` command globally. To uninstall later,
run `npm unlink -g taskmd-web` from the same directory.

## Use

From any taskmd project root (a directory containing a `tasks/` subdirectory):

```sh
taskmd-web
```

This auto-detects the `tasks/` subdirectory, listens on `http://localhost:7878`,
and opens your browser. If there is no `tasks/` subdirectory it falls back to
scanning the current directory.

### Flags

| Flag           | Default | Notes                                                    |
| -------------- | ------- | -------------------------------------------------------- |
| `--port`, `-p` | `7878`  | Fails if the port is already in use.                     |
| `--dir`, `-d`  | cwd     | Override the scan root. The `tasks/` auto-detect still applies. |
| `--no-open`    | (open)  | Do not open the browser on start.                        |
| `--help`, `-h` |         | Print usage.                                             |

### What gets shown

- Tasks with a top-level `group` of `archive` are hidden.
- Files under `.worklogs/` are ignored.
- Frontmatter without an `id`, `status`, or `tags` field is treated as a
  non-task and skipped.

## Development

The most common loop after editing source files:

### Client only (`src/client/**`)

Two options.

**Production build** — refresh the browser to see changes:

```sh
pnpm build
```

**Vite dev server with HMR** — faster, but needs two terminals:

```sh
# terminal 1: API server
taskmd-web --no-open      # run from your tasks project root

# terminal 2: client dev server
pnpm dev:client           # run from this repository
# then open http://localhost:5173
```

### Server only (`src/server/**`)

The server runs as a Node process; you must restart it after a build:

```sh
pnpm build:server
lsof -ti:7878 | xargs kill -9     # stop the running server
taskmd-web                         # start the new build (from your tasks repo)
```

### Both client and server

```sh
pnpm build
lsof -ti:7878 | xargs kill -9
taskmd-web
```

### Dependency or `package.json` changes

```sh
pnpm install
pnpm build
# Re-run `npm link` only if the bin entry or other package.json metadata changed.
```

The global symlink installed by `npm link` always resolves to this checkout's
`bin/taskmd-web.mjs`, which loads from `dist/server/cli.js`. As long as you
re-run `pnpm build`, your local changes ship through the symlink.

## Architecture

- **CLI shellout, not parsing.** The server shells out to
  `taskmd list --format json` for reads and `taskmd set <id> --status … --add-tag … --remove-tag …`
  for writes. No markdown or YAML parsing in this codebase — upstream owns the
  format.
- **In-memory cache.** [src/server/server.ts](src/server/server.ts) keeps the
  last list result in memory and invalidates it on writes or filesystem
  changes.
- **Live refresh.** [src/server/watcher.ts](src/server/watcher.ts) watches the
  scan directory, debounces 150 ms, and emits a `change` event. The SSE
  endpoint `/api/events` broadcasts `tasks-changed` to the client, which
  refetches.
- **Filtering is client-side.** Group, tag-AND, and tag-NOT predicates run in
  [src/client/App.tsx](src/client/App.tsx) over the single `/api/tasks` payload.
  Cheap at typical repository sizes and avoids re-spawning the CLI per filter
  change.

## API

| Method | Path                          | Purpose                                |
| ------ | ----------------------------- | -------------------------------------- |
| GET    | `/api/health`                 | `{ ok, scanDir }`                      |
| GET    | `/api/tasks`                  | All non-archived tasks (cached)        |
| GET    | `/api/tasks/:id/content`      | Rendered body of a task (frontmatter stripped) |
| PATCH  | `/api/tasks/:id`              | Body: `{ status?, priority?, addTags?, removeTags? }` |
| GET    | `/api/events`                 | Server-sent events: `ready`, `tasks-changed`, `ping` |

## What's deliberately out of v1

- No editing of the markdown body — frontmatter only (status, tags).
- Priority is displayed but not editable from the UI.
- No worklog, search, dependency, graph, phase, or multi-project views.
- No archive view (archived tasks are filtered out of the list).
- No persistence of UI state across reloads (filters reset on refresh).

## License

[MIT](LICENSE).

## Relationship to upstream taskmd

This project depends on the upstream [taskmd](https://github.com/driangle/taskmd)
CLI being installed on your PATH. It does not vendor or fork any upstream code,
and it does not modify task files in a way that the upstream CLI would not
also produce. If you stop using `taskmd-web` your task files remain valid
taskmd files.
