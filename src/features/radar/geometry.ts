import type { Deadline, Settings } from "../../types";
import { clamp, getDaysRemaining, getDeadlineState } from "../../utils/dates";
export function hashAngle(id: string) {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) % 360;
}
export function radiusForDays(
  days: number,
  range: Settings["range"],
  radarRadius = 300,
) {
  const normalized =
    range === "all"
      ? Math.log1p(Math.max(0, days)) / Math.log1p(365 * 5)
      : days / Number(range);
  return 88 + clamp(normalized) * (radarRadius - 30 - 88);
}
export function calculateDeadlinePosition({
  deadline,
  range,
  index = 0,
  radarRadius = 300,
  now = new Date(),
}: {
  deadline: Deadline;
  range: Settings["range"];
  index?: number;
  radarRadius?: number;
  now?: Date;
}) {
  const state = getDeadlineState(deadline, now),
    radius =
      state === "OVERDUE"
        ? 54
        : radiusForDays(
            getDaysRemaining(deadline.deadlineDate, now),
            range,
            radarRadius,
          ),
    angle = (hashAngle(deadline.id) + index * 137.508) % 360;
  return {
    x: Math.cos((angle * Math.PI) / 180) * radius,
    y: Math.sin((angle * Math.PI) / 180) * radius,
    radius,
    angle,
    state,
  };
}
export function layoutNodes(
  deadlines: Deadline[],
  range: Settings["range"],
  now: Date,
) {
  const placed: Array<
    ReturnType<typeof calculateDeadlinePosition> & { deadline: Deadline }
  > = [];
  for (const deadline of [...deadlines].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    const p = calculateDeadlinePosition({ deadline, range, now });
    let best = { ...p },
      bestSpacing = -1;
    // Try angular movement first. Only crowded orbits use a bounded ±10px
    // radial adjustment, preserving the meaning of temporal distance.
    for (let i = 0; i < 120; i++) {
      const angle = p.angle + i * 137.508,
        radius = p.radius + (i < 72 ? 0 : ((i % 3) - 1) * 10),
        x = Math.cos((angle * Math.PI) / 180) * radius,
        y = Math.sin((angle * Math.PI) / 180) * radius;
      const spacing = placed.reduce(
        (m, n) => Math.min(m, Math.hypot(x - n.x, y - n.y)),
        Infinity,
      );
      if (spacing > bestSpacing) {
        best = { ...p, angle, radius, x, y };
        bestSpacing = spacing;
      }
      if (spacing >= 30) break;
    }
    placed.push({ ...best, deadline });
  }
  return placed;
}
