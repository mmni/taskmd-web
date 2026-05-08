import type { Task } from "../types.js";
import { TaskRow } from "./TaskRow.js";

interface Props {
  tasks: Task[];
  knownTags: string[];
  planningOptions: string[];
  busyIds: Set<string>;
  onStatusChange: (id: string, next: string) => void;
  onPriorityChange: (id: string, next: string) => void;
  onAddTag: (id: string, tag: string) => void;
  onRemoveTag: (id: string, tag: string) => void;
  onSetPlanning: (id: string, value: string | null) => void;
  onTitleClick: (id: string) => void;
}

export function TaskList({ tasks, knownTags, planningOptions, busyIds, onStatusChange, onPriorityChange, onAddTag, onRemoveTag, onSetPlanning, onTitleClick }: Props) {
  if (tasks.length === 0) {
    return <div className="empty">No tasks match the current filters.</div>;
  }
  return (
    <div className="task-list">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          knownTags={knownTags}
          planningOptions={planningOptions}
          busy={busyIds.has(task.id)}
          onStatusChange={(next) => onStatusChange(task.id, next)}
          onPriorityChange={(next) => onPriorityChange(task.id, next)}
          onAddTag={(tag) => onAddTag(task.id, tag)}
          onRemoveTag={(tag) => onRemoveTag(task.id, tag)}
          onSetPlanning={(value) => onSetPlanning(task.id, value)}
          onTitleClick={() => onTitleClick(task.id)}
        />
      ))}
    </div>
  );
}
