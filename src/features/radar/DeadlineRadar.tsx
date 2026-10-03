import { useMemo, useState } from "react";
import type { Deadline, Settings } from "../../types";
import { layoutNodes, radiusForDays } from "./geometry";
import { getTimeRemaining } from "../../utils/dates";
export function DeadlineRadar({
  deadlines,
  range,
  now,
  selected,
  onSelect,
}: {
  deadlines: Deadline[];
  range: Settings["range"];
  now: Date;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const nodes = useMemo(
      () => layoutNodes(deadlines, range, now),
      [deadlines, range, now],
    ),
    [hover, setHover] = useState<string | null>(null);
  const rings =
    range === "all"
      ? [1, 7, 30, 90, 365, 1825]
      : [1, 3, 7, 14, 30, 90].filter((n) => n <= Number(range));
  const hovered = deadlines.find((d) => d.id === hover);
  return (
    <div className="radar-wrap">
      <svg
        className="radar"
        viewBox="-325 -325 650 650"
        aria-label="Deadline radar. The center is today. Distance represents days remaining."
      >
        <circle r="270" className="radar-field" />
        <g className="radar-grid">
          <path d="M-285 0H285M0 -285V285" />
          {rings.map((n, index) => (
            <g key={n}>
              <circle r={radiusForDays(n, range)} />
              <text
                x={index % 2 === 0 ? 8 : -8}
                textAnchor={index % 2 === 0 ? "start" : "end"}
                y={-radiusForDays(n, range) + 4}
              >
                {n === 1825 ? "5y+" : `${n}d${n === Number(range) ? "+" : ""}`}
              </text>
            </g>
          ))}
          <circle className="overdue-orbit" r={54} />
          <circle r={88} />
        </g>
        <circle r="29" className="today-core" />
        <text className="today-label" textAnchor="middle" y="4">
          TODAY
        </text>
        <text className="overdue-label" textAnchor="middle" y="-42">
          OVERDUE
        </text>
        {nodes.map((p) => {
          const d = p.deadline,
            active = selected === d.id || hover === d.id;
          return (
            <g
              key={d.id}
              role="button"
              tabIndex={0}
              aria-label={`${d.title}, ${getTimeRemaining(d.deadlineDate, now)}, progress ${d.progress} percent, ${d.priority} priority`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(d.id);
                }
              }}
              onClick={() => onSelect(d.id)}
              onMouseEnter={() => setHover(d.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(d.id)}
              onBlur={() => setHover(null)}
              className={`radar-node ${active ? "selected" : ""} ${selected && !active ? "dimmed" : ""} ${d.status === "completed" ? "completed" : ""}`}
              transform={`translate(${p.x},${p.y})`}
            >
              <title>{`${d.title}\n${getTimeRemaining(d.deadlineDate, now)} · ${d.progress}% · ${d.priority}`}</title>
              <circle r="20" fill="transparent" />
              <circle r="13" className="node-track" />
              <circle
                r="13"
                fill="none"
                stroke={p.state === "OVERDUE" ? "var(--danger)" : d.color}
                strokeWidth="3"
                strokeDasharray={`${(d.progress / 100) * 81.68} 81.68`}
                transform="rotate(-90)"
              />
              <circle
                r={d.priority === "urgent" ? 8 : 6}
                fill={p.state === "OVERDUE" ? "var(--danger)" : d.color}
              />
              {d.priority === "urgent" && (
                <text className="priority-mark" textAnchor="middle" y="4">
                  !
                </text>
              )}
              {(active || (deadlines.length <= 8 && d.priority === "high")) && (
                <text
                  className="node-label"
                  textAnchor={
                    p.x > 190 ? "end" : p.x < -190 ? "start" : "middle"
                  }
                  y="-23"
                >
                  {d.title.length > 22 ? d.title.slice(0, 21) + "…" : d.title}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hovered && (
        <div className="radar-tooltip" role="status">
          <strong>{hovered.title}</strong>
          <span>
            {getTimeRemaining(hovered.deadlineDate, now)} · {hovered.progress}%
            complete · {hovered.priority}
          </span>
        </div>
      )}
      <div className="radar-caption">
        <span>Distance = time to deadline</span>
        <span>Node ring = progress</span>
      </div>
      {deadlines.length > 30 && (
        <p className="density-note">
          Dense radar: use filters or the list to inspect overlapping deadlines.
        </p>
      )}
    </div>
  );
}
