import { useState, type FormEvent } from "react";
import { type Deadline, type Category, deadlineSchema } from "../../types";
import { deadlineInput, quickDate } from "../../utils/dates";
import { Modal } from "../../components/Modal";
export function DeadlineForm({
  initial,
  categories,
  onSave,
  onClose,
}: {
  initial?: Deadline;
  categories: Category[];
  onSave: (d: Deadline) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title || ""),
    [description, setDescription] = useState(initial?.description || ""),
    [date, setDate] = useState(
      initial ? deadlineInput(initial.deadlineDate).slice(0, 10) : quickDate(1),
    ),
    [time, setTime] = useState(
      initial ? deadlineInput(initial.deadlineDate).slice(11) : "23:59",
    ),
    [start, setStart] = useState(
      initial?.startDate ? deadlineInput(initial.startDate) : "",
    ),
    [progress, setProgress] = useState(initial?.progress || 0),
    [priority, setPriority] = useState<Deadline["priority"]>(
      initial?.priority || "medium",
    ),
    [category, setCategory] = useState(initial?.category || ""),
    [color, setColor] = useState(initial?.color || "#3978bc"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const dt = new Date(`${date}T${time || "23:59"}`);
    if (!Number.isFinite(dt.getTime())) {
      setError("Choose a valid deadline.");
      return;
    }
    const now = new Date().toISOString();
    const result = deadlineSchema.safeParse({
      id: initial?.id || crypto.randomUUID(),
      title,
      description,
      deadlineDate: dt.toISOString(),
      startDate: start ? new Date(start).toISOString() : null,
      createdAt: initial?.createdAt || now,
      updatedAt: now,
      status: initial?.status || "active",
      progress,
      priority,
      category: category || null,
      color,
      completedAt: initial?.completedAt || null,
      archived: initial?.archived || false,
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      await onSave(result.data);
      onClose();
    } catch {
      setError(
        "Could not save. Your changes are still here; please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={initial ? "Edit deadline" : "Add a deadline"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="form">
        <label>
          Title
          <input
            autoFocus
            required
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What are you working toward?"
          />
        </label>
        <label>
          Description
          <textarea
            value={description}
            maxLength={10000}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Notes, next steps, or a little context"
          />
        </label>
        <div className="form-grid">
          <label>
            Deadline date
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            Time <span className="muted">(local)</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
        </div>
        <div className="quick-buttons">
          {[0, 1, 3, 7, 14, 30].map((n) => (
            <button type="button" key={n} onClick={() => setDate(quickDate(n))}>
              {n === 0 ? "Today" : n === 1 ? "Tomorrow" : `+${n} days`}
            </button>
          ))}
        </div>
        <label>
          Start date{" "}
          <span className="muted">(optional, for progress health)</span>
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label>
          Progress <strong>{progress}%</strong>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
          />
        </label>
        <div className="form-grid">
          <label>
            Priority
            <select
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as Deadline["priority"])
              }
            >
              {["low", "medium", "high", "urgent"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            Category
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setColor(
                  categories.find((c) => c.id === e.target.value)?.color ||
                    color,
                );
              }}
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="color-field">
          Node color
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save deadline"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
