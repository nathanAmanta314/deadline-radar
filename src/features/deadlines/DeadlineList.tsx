import { Flag } from "lucide-react";
import type { Deadline, Category } from "../../types";
import {
  formatDeadline,
  getTimeRemaining,
  getDeadlineState,
  getProgressHealth,
} from "../../utils/dates";
export function DeadlineList({
  deadlines,
  categories,
  now,
  selected,
  onSelect,
}: {
  deadlines: Deadline[];
  categories: Category[];
  now: Date;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="deadline-list">
      {deadlines.map((d, index) => {
        const state = getDeadlineState(d, now),
          health = getProgressHealth(d, now),
          category = categories.find((c) => c.id === d.category);
        return (
          <button
            id={`deadline-${d.id}`}
            key={d.id}
            className={`deadline-card ${state.toLowerCase()} ${selected === d.id ? "selected" : ""}`}
            onClick={() => onSelect(d.id)}
          >
            <span className="task-index" aria-hidden="true">
              {index + 1}
              <small>.</small>
            </span>
            <span className="task-content">
              <span className="task-kicker">
                <i style={{ background: d.color }} />
                {category?.name || "Uncategorized"}
                <span> / </span>
                {state.replaceAll("_", " ")}
              </span>
              <strong className="task-title">{d.title}</strong>
              <span className="task-date">
                {formatDeadline(d.deadlineDate)}
              </span>
              {d.description && (
                <span className="task-description">{d.description}</span>
              )}
              <span className="task-metadata">
                <span className="time-status">
                  {d.status === "completed"
                    ? "Completed"
                    : getTimeRemaining(d.deadlineDate, now)}
                </span>
                <span className="task-priority">
                  <Flag size={12} />
                  {d.priority}
                </span>
                {health && (
                  <span
                    className={health === "Behind" ? "health behind" : "health"}
                  >
                    {health}
                  </span>
                )}
              </span>
            </span>
            <span
              className="task-progress"
              aria-label={`${d.progress}% complete`}
            >
              <svg viewBox="0 0 80 80" aria-hidden="true">
                <circle className="progress-track" cx="40" cy="40" r="30" />
                <circle
                  className="progress-value"
                  cx="40"
                  cy="40"
                  r="30"
                  strokeDasharray={`${d.progress * 1.885} 188.5`}
                  transform="rotate(-90 40 40)"
                />
              </svg>
              <strong>
                {d.progress}
                <small>%</small>
              </strong>
              <span>COMPLETE</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
