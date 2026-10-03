import { DeadlineRadar } from "./DeadlineRadar";
import type { Category, Deadline, Settings } from "../../types";
export function RadarPanel({
  visible,
  categories,
  settings,
  setSettings,
  now,
  selected,
  setSelected,
}: {
  visible: Deadline[];
  categories: Category[];
  settings: Settings;
  setSettings: (s: Settings) => void;
  now: Date;
  selected: string | null;
  setSelected: (id: string) => void;
}) {
  return (
    <section className="radar-panel" aria-label="Your radar">
      <div className="panel-heading">
        <div>
          <h2>
            Your radar <span className="count-pill">{visible.length}</span>
          </h2>
        </div>
        <div className="segmented" aria-label="Radar range">
          {(["7", "14", "30", "90", "all"] as const).map((r) => (
            <button
              key={r}
              aria-pressed={settings.range === r}
              className={settings.range === r ? "active" : ""}
              onClick={() => setSettings({ ...settings, range: r })}
            >
              {r === "all" ? "All" : r + "d"}
            </button>
          ))}
        </div>
      </div>
      <DeadlineRadar
        deadlines={visible}
        range={settings.range}
        now={now}
        selected={selected}
        onSelect={setSelected}
      />
      <div className="radar-footer">
        <div className="category-legend">
          {categories
            .filter((c) => visible.some((d) => d.category === c.id))
            .map((c) => (
              <span key={c.id}>
                <i style={{ background: c.color }} />
                {c.name}
              </span>
            ))}
        </div>
        <span className="muted">LIVE · LOCAL TIME</span>
      </div>
    </section>
  );
}
