# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] — 2026-05-04

### Added

- **Inline priority edit.** Clicking a priority chip cycles through `low →
  medium → high → critical` and persists via `taskmd set --priority`,
  matching the status chip behavior.

## [0.2.0] — 2026-05-03

### Added

- **Bulk archive buttons.** Two header buttons archive all `completed` /
  `cancelled` tasks in one click, shelling out to `taskmd archive
  --all-completed -y` and `taskmd archive --all-cancelled -y`. Each button
  shows a live count and is disabled when zero. Confirms before running.
- **`POST /api/archive`** endpoint accepting `{ scope: "completed" |
  "cancelled" }`. Invalidates the task cache on success.

## [0.1.0] — 2026-05-02

Initial public release.

### Added

- **Task list.** Reads tasks from a `tasks/` subdirectory (auto-detected) of
  the current working directory by shelling out to `taskmd list --format json`.
  Falls back to the current directory when no `tasks/` subdir is present.
  Skips entries without an `id`, `status`, or `tags` array, and hides anything
  in the `archive` group.
- **Group filter.** Tab strip across the top with a count per group plus an
  "all" option, derived from the top-level subdirectory under `tasks/`
  (e.g. `app`, `web`, `cross`, `marketing`).
- **Tag filter (AND + NOT).** Each tag chip cycles through three states:
  neutral, include (require), and exclude. The active expression is rendered
  in plain text (e.g. `app AND ux AND NOT inbox`). The full chip list collapses
  to just the expression line.
- **Inline status edit.** Clicking a status chip cycles through `pending →
  in-progress → in-review → blocked → completed → cancelled` and persists via
  `taskmd set --status`.
- **Inline tag edit.** Each task row supports adding tags (with autocomplete
  from existing tags, but free-text allowed) and removing tags via per-chip
  controls. Persisted via `taskmd set --add-tag` / `--remove-tag`.
- **Task body viewer.** Clicking a task title opens a modal with the rendered
  markdown body. Frontmatter is stripped on the server. Closes on `Esc`,
  backdrop click, or the `×` button.
- **Live refresh.** A filesystem watcher on the scan directory broadcasts
  `tasks-changed` events over Server-Sent Events. Edits made in your editor or
  via the CLI in another terminal show up automatically without a manual
  refresh.
- **Theme toggle.** Light / dark theme with a button in the header. Initial
  theme respects `localStorage.theme` then falls back to OS
  `prefers-color-scheme`. An inline pre-paint script avoids a flash on reload.
- **CLI.** `taskmd-web start [--port 7878] [--dir <path>] [--no-open]`. Opens
  the browser by default; fails loudly if the port is already in use.
- **MIT license.**

### Architecture

- Server: Node 20+, Hono on `@hono/node-server`. Caches the last `taskmd list`
  result in memory; cache is invalidated on any inbound write or filesystem
  change.
- Client: React 18 + Vite, plain CSS. Group / AND / NOT filtering runs entirely
  in the browser over the single `/api/tasks` payload.
- Markdown rendering: `marked` for the task body modal.

### Out of scope for this release

- No body markdown editing — frontmatter only (status, tags).
- Priority is displayed but not editable from the UI.
- No worklog, search, dependency, graph, phase, or multi-project views.
- No archive view — archived tasks are filtered out.
- No persistence of UI filter state across reloads.

[0.3.0]: https://github.com/mmni/taskmd-web/releases/tag/v0.3.0
[0.2.0]: https://github.com/mmni/taskmd-web/releases/tag/v0.2.0
[0.1.0]: https://github.com/mmni/taskmd-web/releases/tag/v0.1.0
