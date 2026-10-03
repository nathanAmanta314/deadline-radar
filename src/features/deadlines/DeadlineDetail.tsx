import { useState } from "react";
import type { Deadline, Category } from "../../types";
import {
  formatDeadline,
  getTimeRemaining,
  getProgressHealth,
  getDeadlineState,
  quickDate,
} from "../../utils/dates";
import { Modal } from "../../components/Modal";
export function DeadlineDetail({
  deadline: d,
  categories,
  now,
  onClose,
  onEdit,
  onChange,
  onDelete,
  onDuplicate,
}: {
  deadline: Deadline;
  categories: Category[];
  now: Date;
  onClose: () => void;
  onEdit: () => void;
  onChange: (d: Deadline) => Promise<void>;
  onDelete: () => Promise<void>;
  onDuplicate: () => Promise<void>;
}) {
  const [confirm, setConfirm] = useState(false),
    [reschedule, setReschedule] = useState(false),
    [custom, setCustom] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function act(fn: () => Promise<void>, close = true) {
    setBusy(true);
    try {
      await fn();
      if (close) onClose();
    } catch {
      setError("Could not save this change. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const health = getProgressHealth(d, now);
  return (
    <Modal title={d.title} onClose={onClose}>
      <p className={`badge ${getDeadlineState(d, now).toLowerCase()}`}>
        {getDeadlineState(d, now).replaceAll("_", " ")}
      </p>
      <p className="detail-time">{getTimeRemaining(d.deadlineDate, now)}</p>
      <dl>
        <dt>Deadline</dt>
        <dd>{formatDeadline(d.deadlineDate)}</dd>
        <dt>Category</dt>
        <dd>
          {categories.find((c) => c.id === d.category)?.name || "Uncategorized"}
        </dd>
        <dt>Priority</dt>
        <dd>{d.priority}</dd>
        <dt>Progress</dt>
        <dd>
          {d.progress}% {health && `· ${health}`}
        </dd>
        {d.completedAt && (
          <>
            <dt>Completed</dt>
            <dd>{formatDeadline(d.completedAt)}</dd>
          </>
        )}
      </dl>
      <progress value={d.progress} max={100} />
      <p className="description">{d.description || "No additional notes."}</p>
      <fieldset disabled={busy} className="detail-actions">
        <button
          className="primary"
          onClick={() =>
            act(() =>
              onChange({
                ...d,
                status: d.status === "completed" ? "active" : "completed",
                progress: d.status === "completed" ? d.progress : 100,
                completedAt:
                  d.status === "completed" ? null : new Date().toISOString(),
              }),
            )
          }
        >
          {d.status === "completed" ? "Reopen deadline" : "Mark completed"}
        </button>
        <button onClick={onEdit}>Edit</button>
        <button onClick={() => setReschedule(!reschedule)}>Reschedule</button>
        <button onClick={() => act(onDuplicate)}>Duplicate</button>
        <button
          onClick={() => act(() => onChange({ ...d, archived: !d.archived }))}
        >
          {d.archived ? "Restore from archive" : "Archive"}
        </button>
        <button className="danger" onClick={() => setConfirm(true)}>
          Delete
        </button>
      </fieldset>
      {reschedule && (
        <div className="inset">
          <h3>Move deadline</h3>
          <div className="quick-buttons">
            {[1, 3, 7].map((n) => (
              <button
                key={n}
                disabled={busy}
                onClick={() =>
                  act(() =>
                    onChange({
                      ...d,
                      deadlineDate: new Date(
                        `${quickDate(n)}T23:59`,
                      ).toISOString(),
                    }),
                  )
                }
              >
                {n === 1 ? "Tomorrow" : `+${n} days`}
              </button>
            ))}
          </div>
          <label>
            Custom deadline
            <input
              type="datetime-local"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          </label>
          <button
            disabled={!custom || busy}
            onClick={() =>
              act(() =>
                onChange({
                  ...d,
                  deadlineDate: new Date(custom).toISOString(),
                }),
              )
            }
          >
            Apply date
          </button>
        </div>
      )}
      {confirm && (
        <div className="inset">
          <p>Delete “{d.title}”? This cannot be undone.</p>
          <button
            className="danger"
            disabled={busy}
            onClick={() => act(onDelete)}
          >
            Confirm delete
          </button>{" "}
          <button onClick={() => setConfirm(false)}>Keep deadline</button>
        </div>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </Modal>
  );
}
