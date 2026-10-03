import { useEffect, useMemo, useRef, useState } from "react";
import {
  Radar,
  Plus,
  Search,
  ChevronRight,
  CalendarDays,
  Check,
  SlidersHorizontal,
} from "lucide-react";
import { useData, useSettings, useClock } from "./hooks/useData";
import { type Deadline, type Settings as Preferences } from "./types";
import { deadlineRepository, db, defaultCategories } from "./db/repository";
import { getDeadlineState, getTimeRemaining } from "./utils/dates";
import { RadarPanel } from "./features/radar/RadarPanel";
import { Navigation } from "./components/Navigation";
import { Header } from "./components/Header";
import { SummaryBar } from "./components/SummaryBar";
import { DeadlineForm } from "./features/deadlines/DeadlineForm";
import { DeadlineDetail } from "./features/deadlines/DeadlineDetail";
import { DeadlineList } from "./features/deadlines/DeadlineList";
import { Settings, sortLabels } from "./features/settings/Settings";
import { EmptyState } from "./components/Modal";
import { demoDeadlines } from "./lib/demo";
const filters = [
  "All",
  "Active",
  "Due soon",
  "Today",
  "Overdue",
  "Completed",
] as const;
type Filter = (typeof filters)[number];
const route = () => location.hash.slice(1) || "/";
export default function App() {
  const { deadlines, categories, error, loading } = useData(),
    [settings, setSettings] = useSettings(),
    now = useClock(),
    [page, setPage] = useState(route),
    [filter, setFilter] = useState<Filter>("All"),
    [category, setCategory] = useState(""),
    [priority, setPriority] = useState(""),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [form, setForm] = useState<Deadline | "new" | null>(null),
    [toast, setToast] = useState(""),
    [onboarding, setOnboarding] = useState(() => {
      try {
        return !localStorage.getItem("radar-onboarded");
      } catch {
        return true;
      }
    }),
    [demoBusy, setDemoBusy] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const update = () => {
      setPage(route());
      setSelected(null);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        document.querySelector("dialog[open]") ||
        (e.target instanceof HTMLElement &&
          (e.target.matches("input,textarea,select") ||
            e.target.isContentEditable))
      )
        return;
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        setForm("new");
      }
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const live = deadlines.filter((d) => !d.archived),
    active = live.filter((d) => d.status === "active");
  const counts = {
    Active: active.length,
    "Due soon": active.filter((d) => getDeadlineState(d, now) === "DUE_SOON")
      .length,
    Today: active.filter((d) => getDeadlineState(d, now) === "DUE_TODAY")
      .length,
    Overdue: active.filter((d) => getDeadlineState(d, now) === "OVERDUE")
      .length,
    Completed: live.filter((d) => d.status === "completed").length,
  };
  const next = [...active]
    .filter((d) => getDeadlineState(d, now) !== "OVERDUE")
    .sort((a, b) => Date.parse(a.deadlineDate) - Date.parse(b.deadlineDate))[0];
  const visible = useMemo(
    () =>
      deadlines.filter((d) => {
        if (d.archived !== (page === "/archive")) return false;
        const state = getDeadlineState(d, now);
        if (page !== "/archive") {
          if (
            filter === "All" &&
            !settings.showCompleted &&
            d.status === "completed"
          )
            return false;
          if (filter === "Active" && d.status !== "active") return false;
          if (filter === "Completed" && state !== "COMPLETED") return false;
          if (filter === "Due soon" && state !== "DUE_SOON") return false;
          if (filter === "Today" && state !== "DUE_TODAY") return false;
          if (filter === "Overdue" && state !== "OVERDUE") return false;
        }
        return (
          (!category || d.category === category) &&
          (!priority || d.priority === priority) &&
          `${d.title} ${d.description} ${categories.find((c) => c.id === d.category)?.name || "Uncategorized"}`
            .toLowerCase()
            .includes(search.toLowerCase())
        );
      }),
    [
      deadlines,
      categories,
      page,
      filter,
      settings.showCompleted,
      category,
      priority,
      search,
      now,
    ],
  );
  const sorted = useMemo(
    () =>
      [...visible].sort((a, b) => {
        switch (settings.sort) {
          case "farthest":
            return Date.parse(b.deadlineDate) - Date.parse(a.deadlineDate);
          case "priority":
            return (
              ["urgent", "high", "medium", "low"].indexOf(a.priority) -
              ["urgent", "high", "medium", "low"].indexOf(b.priority)
            );
          case "progress-up":
            return a.progress - b.progress;
          case "progress-down":
            return b.progress - a.progress;
          case "recent":
            return Date.parse(b.createdAt) - Date.parse(a.createdAt);
          default:
            return Date.parse(a.deadlineDate) - Date.parse(b.deadlineDate);
        }
      }),
    [visible, settings.sort],
  );
  const current = deadlines.find((d) => d.id === selected);
  async function save(d: Deadline) {
    await deadlineRepository.update({
      ...d,
      updatedAt: new Date().toISOString(),
    });
    setToast("Deadline saved");
  }
  async function loadDemo() {
    setDemoBusy(true);
    try {
      await db.transaction("rw", db.deadlines, db.categories, async () => {
        for (const c of defaultCategories)
          if (!(await db.categories.get(c.id))) await db.categories.add(c);
        await db.deadlines.bulkAdd(demoDeadlines());
      });
      setToast("Demo deadlines added");
    } catch {
      setToast("Could not load demo data. Please try again.");
    } finally {
      setDemoBusy(false);
    }
  }
  return (
    <div className="app-shell">
      <Navigation
        page={page}
        archiveCount={deadlines.filter((d) => d.archived).length}
      />
      <main>
        <Header
          page={page}
          storageState={
            error
              ? "Storage unavailable"
              : loading
                ? "Opening local storage…"
                : "Saved on this device"
          }
        />
        <div
          className={`page-content ${page === "/" ? "dashboard-page" : "secondary-page"}`}
        >
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                <CalendarDays size={15} />
                {now.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <h1>
                {page === "/settings" ? (
                  "Your workspace."
                ) : page === "/archive" ? (
                  "Filed away."
                ) : (
                  <>
                    See what’s
                    <br />
                    getting <span className="headline-mark">closer.</span>
                  </>
                )}
              </h1>
              <p className="subtitle">
                {page === "/settings"
                  ? "Preferences, categories, and a safe copy of your data."
                  : page === "/archive"
                    ? "Archived deadlines, ready to restore when you need them."
                    : "Your deadlines, with a little perspective. The closer a task is to the center, the sooner it’s due."}
              </p>
            </div>
            <button
              className="primary add-button"
              disabled={loading || !!error}
              onClick={() => setForm("new")}
            >
              <Plus size={18} />
              Add deadline
              <span className="key-hint" aria-hidden="true">
                N
              </span>
            </button>
            {page === "/" && (
              <p className="workspace-note">
                NO ACCOUNT. NO SYNC. JUST YOUR BROWSER.
              </p>
            )}
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {loading ? (
            <p className="panel empty">Opening your workspace…</p>
          ) : page === "/settings" ? (
            <Settings
              deadlines={deadlines}
              categories={categories}
              settings={settings}
              setSettings={setSettings}
              notify={setToast}
            />
          ) : (
            <>
              {page === "/" && (
                <>
                  <SummaryBar
                    counts={counts}
                    filter={filter}
                    setFilter={setFilter}
                  />
                  {onboarding && (
                    <div className="onboarding">
                      <Radar size={23} />
                      <p>
                        <strong>The center is today.</strong> Deadlines move
                        closer as their date approaches. Node rings show your
                        progress.
                      </p>
                      <button
                        onClick={() => {
                          setOnboarding(false);
                          try {
                            localStorage.setItem("radar-onboarded", "yes");
                          } catch {
                            /* Optional preference. */
                          }
                        }}
                      >
                        <Check size={16} />
                        Got it
                      </button>
                    </div>
                  )}
                  <RadarPanel
                    visible={visible}
                    categories={categories}
                    settings={settings}
                    setSettings={setSettings}
                    now={now}
                    selected={selected}
                    setSelected={setSelected}
                  />
                  {next && (
                    <button
                      className="next-deadline"
                      onClick={() => setSelected(next.id)}
                    >
                      <span className="next-icon">
                        <CalendarDays size={19} />
                      </span>
                      <span>
                        <small>UP NEXT</small>
                        <strong>{next.title}</strong>
                      </span>
                      <span className="next-time">
                        {getTimeRemaining(next.deadlineDate, now)}
                        <ChevronRight size={17} />
                      </span>
                    </button>
                  )}
                </>
              )}
              <section className="list-section">
                <div className="section-heading">
                  <h2>
                    {page === "/archive"
                      ? "Archived deadlines"
                      : "Your deadlines"}{" "}
                    <span className="count-pill">{visible.length}</span>
                  </h2>
                  <label className="sort-select">
                    <SlidersHorizontal size={16} />
                    <select
                      aria-label="Sort deadlines"
                      value={settings.sort}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          sort: e.target.value as Preferences["sort"],
                        })
                      }
                    >
                      {Object.entries(sortLabels).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="filters">
                  <label className="search">
                    <Search size={17} />
                    <input
                      ref={searchRef}
                      aria-label="Search deadlines"
                      placeholder="Search deadlines…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <kbd>/</kbd>
                  </label>
                  <select
                    aria-label="Filter category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">All categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Filter priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="">All priorities</option>
                    {["urgent", "high", "medium", "low"].map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>
                {page === "/" && (
                  <div className="filter-row">
                    <div className="filter-tabs">
                      {filters.map((f) => (
                        <button
                          key={f}
                          className={f === filter ? "active" : ""}
                          onClick={() => setFilter(f)}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={settings.showCompleted}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            showCompleted: e.target.checked,
                          })
                        }
                      />
                      Show completed
                    </label>
                  </div>
                )}
                {visible.length ? (
                  <DeadlineList
                    deadlines={sorted}
                    categories={categories}
                    now={now}
                    selected={selected}
                    onSelect={setSelected}
                  />
                ) : (
                  <EmptyState
                    title={
                      page === "/archive"
                        ? "No archived deadlines."
                        : !deadlines.length
                          ? "Your radar is clear."
                          : filter === "Overdue"
                            ? "No overdue deadlines."
                            : "No deadlines match your search."
                    }
                  >
                    <p className="muted">
                      {!deadlines.length
                        ? "Add your first deadline, or explore how the radar works."
                        : "Try another filter or add something new."}
                    </p>
                    <div className="button-row">
                      <button onClick={() => setForm("new")}>
                        Add your first deadline
                      </button>
                      {!deadlines.length && (
                        <button
                          disabled={demoBusy || !!error}
                          onClick={loadDemo}
                        >
                          Load demo data
                        </button>
                      )}
                    </div>
                  </EmptyState>
                )}
              </section>
            </>
          )}
          <footer className="page-footer">
            <a className="footer-brand" href="#/">
              Deadline Radar.
            </a>
            <span>
              Distance is time.
              <br />
              Your data stays here.
            </span>
            <a href="#/settings">Settings & backup</a>
          </footer>
        </div>
      </main>
      {form && (
        <DeadlineForm
          initial={form === "new" ? undefined : form}
          categories={categories}
          onSave={save}
          onClose={() => setForm(null)}
        />
      )}{" "}
      {current && !form && (
        <DeadlineDetail
          deadline={current}
          categories={categories}
          now={now}
          onClose={() => setSelected(null)}
          onEdit={() => setForm(current)}
          onChange={save}
          onDelete={async () => {
            await deadlineRepository.remove(current.id);
            setToast("Deadline deleted");
          }}
          onDuplicate={async () => {
            const stamp = new Date().toISOString();
            await deadlineRepository.create({
              ...current,
              id: crypto.randomUUID(),
              title: (current.title + " (copy)").slice(0, 160),
              createdAt: stamp,
              updatedAt: stamp,
              status: "active",
              completedAt: null,
              archived: false,
            });
            setToast("Deadline duplicated");
          }}
        />
      )}
      {toast && (
        <div role="status" className="toast">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
