import { useCallback, useEffect, useMemo, useState } from "react";
import type { Task, TagState } from "./types.js";
import { archiveAll, fetchTasks, patchTask, subscribeTaskChanges } from "./api.js";
import { GroupTabs } from "./components/GroupTabs.js";
import { TagFilterBar } from "./components/TagFilterBar.js";
import { TaskList } from "./components/TaskList.js";
import { TaskDetail } from "./components/TaskDetail.js";
import { useTheme } from "./useTheme.js";

function nextTagState(s: TagState): TagState {
  if (s === "neutral") return "include";
  if (s === "include") return "exclude";
  return "neutral";
}

export function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [tagState, setTagState] = useState<Record<string, TagState>>({});
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<"completed" | "cancelled" | null>(null);

  const reload = useCallback(async () => {
    try {
      const t = await fetchTasks();
      setTasks(t);
      setError(null);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  useEffect(() => {
    reload();
    const unsubscribe = subscribeTaskChanges(() => {
      reload();
    });
    return unsubscribe;
  }, [reload]);

  const groups = useMemo(() => {
    if (!tasks) return [];
    const set = new Set<string>();
    for (const t of tasks) if (t.group) set.add(t.group);
    return Array.from(set).sort();
  }, [tasks]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!tasks) return counts;
    for (const t of tasks) counts[t.group] = (counts[t.group] ?? 0) + 1;
    return counts;
  }, [tasks]);

  // Tags shown in the filter bar are derived from tasks visible after group filter,
  // so the filter bar reflects what's actually pickable in the current scope.
  const groupFiltered = useMemo(() => {
    if (!tasks) return [];
    if (!selectedGroup) return tasks;
    return tasks.filter((t) => t.group === selectedGroup);
  }, [tasks, selectedGroup]);

  const tagsInScope = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of groupFiltered) {
      for (const tag of t.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [groupFiltered]);

  const knownTags = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks ?? []) for (const tag of t.tags) set.add(tag);
    return Array.from(set).sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const includes = Object.entries(tagState)
      .filter(([, s]) => s === "include")
      .map(([t]) => t);
    const excludes = Object.entries(tagState)
      .filter(([, s]) => s === "exclude")
      .map(([t]) => t);
    return groupFiltered.filter((task) => {
      for (const inc of includes) if (!task.tags.includes(inc)) return false;
      for (const exc of excludes) if (task.tags.includes(exc)) return false;
      return true;
    });
  }, [groupFiltered, tagState]);

  const cycleTag = (tag: string) => {
    setTagState((prev) => {
      const next = { ...prev };
      const newState = nextTagState(next[tag] ?? "neutral");
      if (newState === "neutral") delete next[tag];
      else next[tag] = newState;
      return next;
    });
  };

  const clearTagFilter = () => setTagState({});

  const withBusy = async (id: string, fn: () => Promise<void>) => {
    setBusyIds((s) => new Set(s).add(id));
    try {
      await fn();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  };

  const onStatusChange = (id: string, next: string) =>
    withBusy(id, async () => {
      await patchTask(id, { status: next });
      await reload();
    });

  const onPriorityChange = (id: string, next: string) =>
    withBusy(id, async () => {
      await patchTask(id, { priority: next });
      await reload();
    });

  const onAddTag = (id: string, tag: string) =>
    withBusy(id, async () => {
      await patchTask(id, { addTags: [tag] });
      await reload();
    });

  const onRemoveTag = (id: string, tag: string) =>
    withBusy(id, async () => {
      await patchTask(id, { removeTags: [tag] });
      await reload();
    });

  const completedCount = useMemo(
    () => (tasks ?? []).filter((t) => t.status === "completed").length,
    [tasks]
  );
  const cancelledCount = useMemo(
    () => (tasks ?? []).filter((t) => t.status === "cancelled").length,
    [tasks]
  );

  const onArchive = async (scope: "completed" | "cancelled", count: number) => {
    if (count === 0 || archiving) return;
    if (!window.confirm(`Archive ${count} ${scope} task${count === 1 ? "" : "s"}?`)) return;
    setArchiving(scope);
    try {
      await archiveAll(scope);
      await reload();
    } catch (err) {
      setError(String(err));
    } finally {
      setArchiving(null);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>taskmd-web</h1>
        <div className="header-meta">
          {tasks && <span>{filteredTasks.length} of {tasks.length} tasks</span>}
          <button
            className="archive-btn"
            onClick={() => onArchive("completed", completedCount)}
            disabled={completedCount === 0 || archiving !== null}
            title="taskmd archive --all-completed -y"
          >
            {archiving === "completed" ? "archiving…" : `archive completed (${completedCount})`}
          </button>
          <button
            className="archive-btn"
            onClick={() => onArchive("cancelled", cancelledCount)}
            disabled={cancelledCount === 0 || archiving !== null}
            title="taskmd archive --all-cancelled -y"
          >
            {archiving === "cancelled" ? "archiving…" : `archive cancelled (${cancelledCount})`}
          </button>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={`switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-label="toggle theme"
          >
            {theme === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {error && (
        <div className="error">
          {error}
          <button onClick={() => setError(null)}>dismiss</button>
        </div>
      )}

      {tasks === null ? (
        <div className="loading">Loading tasks…</div>
      ) : (
        <>
          <GroupTabs
            groups={groups}
            selected={selectedGroup}
            counts={groupCounts}
            total={tasks.length}
            onSelect={setSelectedGroup}
          />
          <TagFilterBar
            tags={tagsInScope}
            state={tagState}
            onCycle={cycleTag}
            onClear={clearTagFilter}
          />
          <TaskList
            tasks={filteredTasks}
            knownTags={knownTags}
            busyIds={busyIds}
            onStatusChange={onStatusChange}
            onPriorityChange={onPriorityChange}
            onAddTag={onAddTag}
            onRemoveTag={onRemoveTag}
            onTitleClick={setOpenTaskId}
          />
        </>
      )}

      {openTaskId && tasks && (() => {
        const task = tasks.find((t) => t.id === openTaskId);
        if (!task) return null;
        return <TaskDetail task={task} onClose={() => setOpenTaskId(null)} />;
      })()}
    </div>
  );
}
