import { useState } from "react";
import { Download, Upload, Plus } from "lucide-react";
import {
  backupSchema,
  defaultSettings,
  type Backup,
  type Category,
  type Deadline,
  type Settings as Preferences,
} from "../../types";
import {
  categoryRepository,
  importBackup,
  resetData,
} from "../../db/repository";
import { localDate } from "../../utils/dates";
import { Modal } from "../../components/Modal";
export function Settings({
  deadlines,
  categories,
  settings,
  setSettings,
  notify,
}: {
  deadlines: Deadline[];
  categories: Category[];
  settings: Preferences;
  setSettings: (s: Preferences) => void;
  notify: (s: string) => void;
}) {
  const [backup, setBackup] = useState<Backup | null>(null),
    [mode, setMode] = useState("merge"),
    [confirmation, setConfirmation] = useState(""),
    [reset, setReset] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<Category | null>(null),
    [name, setName] = useState(""),
    [color, setColor] = useState("#3978bc"),
    [deleting, setDeleting] = useState<Category | null>(null);
  async function run(fn: () => Promise<void>, message: string) {
    setBusy(true);
    setError("");
    try {
      await fn();
      notify(message);
    } catch {
      setError("The change could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  function exportData() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            app: "deadline-radar",
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            deadlines,
            categories,
            settings,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deadline-radar-backup-${localDate()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Backup exported");
  }
  async function readFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose a backup smaller than 10 MB.");
      return;
    }
    try {
      setBackup(backupSchema.parse(JSON.parse(await file.text())));
      setMode("merge");
      setConfirmation("");
    } catch {
      setError(
        "This file is not a valid Deadline Radar v1 backup. No data was changed.",
      );
    }
  }
  return (
    <div className="settings-layout">
      <section className="panel settings-panel">
        <h2>Preferences</h2>
        <p className="muted">Theme, radar range, and display options.</p>
        <div className="form">
          <label>
            Theme
            <select
              value={settings.theme}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  theme: e.target.value as Preferences["theme"],
                })
              }
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <div className="form-grid">
            <label>
              Default radar range
              <select
                value={settings.range}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    range: e.target.value as Preferences["range"],
                  })
                }
              >
                {["7", "14", "30", "90", "all"].map((r) => (
                  <option key={r} value={r}>
                    {r === "all" ? "All time" : r + " days"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Default sort
              <select
                value={settings.sort}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    sort: e.target.value as Preferences["sort"],
                  })
                }
              >
                {Object.entries(sortLabels).map(([v, l]) => (
                  <option value={v} key={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={settings.showCompleted}
              onChange={(e) =>
                setSettings({ ...settings, showCompleted: e.target.checked })
              }
            />
            Show completed deadlines
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) =>
                setSettings({ ...settings, reducedMotion: e.target.checked })
              }
            />
            Reduce motion
          </label>
        </div>
        <p className="muted">
          Keyboard: <kbd>N</kbd> new deadline · <kbd>/</kbd> search ·{" "}
          <kbd>Esc</kbd> close
        </p>
      </section>
      <section className="panel settings-panel">
        <h2>Categories</h2>
        <div className="category-list">
          {categories.map((c) => (
            <div key={c.id}>
              <span className="category-dot" style={{ background: c.color }} />
              <strong>{c.name}</strong>
              <button
                onClick={() => {
                  setEditing(c);
                  setName(c.name);
                  setColor(c.color);
                }}
              >
                Edit
              </button>
              <button className="danger" onClick={() => setDeleting(c)}>
                Delete
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            setEditing({ id: crypto.randomUUID(), name: "", color: "#3978bc" });
            setName("");
            setColor("#3978bc");
          }}
        >
          <Plus size={16} />
          New category
        </button>
      </section>
      <section className="panel settings-panel">
        <h2>Your data, in your hands</h2>
        <p>
          Your deadlines are stored in this browser. Nothing is uploaded to a
          server.
        </p>
        <p className="muted">
          Clearing browser site data can remove deadlines. Export a backup
          regularly, and use it to move between browsers.
        </p>
        <div className="button-row">
          <button onClick={exportData}>
            <Download size={17} />
            Export backup
          </button>
          <label className="button">
            <Upload size={17} />
            Import backup
            <input
              className="file-input"
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                void readFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </section>
      <section className="panel settings-panel">
        <h2>Reset workspace</h2>
        <p className="muted">
          Remove every deadline and restore default categories and preferences.
        </p>
        <button
          className="danger"
          onClick={() => {
            setReset(true);
            setConfirmation("");
          }}
        >
          Reset all data
        </button>
      </section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {backup && (
        <Modal title="Import backup" onClose={() => setBackup(null)}>
          <p>
            {backup.deadlines.length} deadlines · {backup.categories.length}{" "}
            categories
          </p>
          <p className="muted">
            Merge updates matching IDs and keeps other records. Replace removes
            your current records and restores backup preferences.
          </p>
          <label>
            Import mode
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="merge">Merge</option>
              <option value="replace">Replace all</option>
            </select>
          </label>
          {mode === "replace" && (
            <label>
              Type REPLACE to confirm
              <input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </label>
          )}
          <div className="modal-footer">
            <button
              disabled={
                busy || (mode === "replace" && confirmation !== "REPLACE")
              }
              className="primary"
              onClick={() =>
                run(async () => {
                  await importBackup(backup, mode === "replace");
                  if (mode === "replace") setSettings(backup.settings);
                  setBackup(null);
                }, "Backup imported")
              }
            >
              Import backup
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
        </Modal>
      )}
      {reset && (
        <Modal title="Reset all data?" onClose={() => setReset(false)}>
          <p>Export a backup first. This action cannot be undone.</p>
          <label>
            Type RESET to confirm
            <input
              autoFocus
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
          <div className="modal-footer">
            <button
              className="danger"
              disabled={confirmation !== "RESET" || busy}
              onClick={() =>
                run(async () => {
                  await resetData();
                  setSettings(defaultSettings);
                  setReset(false);
                }, "Workspace reset")
              }
            >
              Permanently reset
            </button>
          </div>
        </Modal>
      )}
      {editing && (
        <Modal
          title={editing.name ? "Edit category" : "New category"}
          onClose={() => setEditing(null)}
        >
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await categoryRepository.save({
                  ...editing,
                  name: name.trim(),
                  color,
                });
                setEditing(null);
              }, "Category saved");
            }}
          >
            <label>
              Name
              <input
                autoFocus
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Color
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </label>
            <button className="primary" disabled={busy || !name.trim()}>
              Save category
            </button>
            {error && <p role="alert">{error}</p>}
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal title="Delete category?" onClose={() => setDeleting(null)}>
          <p>
            Deadlines in {deleting.name} will become Uncategorized. Your
            deadlines will be kept.
          </p>
          <button
            disabled={busy}
            className="danger"
            onClick={() =>
              run(async () => {
                await categoryRepository.remove(deleting.id);
                setDeleting(null);
              }, "Category deleted")
            }
          >
            Confirm delete category
          </button>
        </Modal>
      )}
    </div>
  );
}
export const sortLabels: Record<Preferences["sort"], string> = {
  nearest: "Deadline nearest",
  farthest: "Deadline farthest",
  priority: "Priority",
  "progress-up": "Progress low–high",
  "progress-down": "Progress high–low",
  recent: "Recently created",
};
