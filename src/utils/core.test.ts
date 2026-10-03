import { describe, it, expect } from "vitest";
import {
  getDaysRemaining,
  getTimeRemaining,
  getUrgency,
  getDeadlineState,
  getExpectedProgress,
  getProgressHealth,
  formatDeadline,
  isOverdue,
  isDueToday,
} from "./dates";
import {
  calculateDeadlinePosition,
  layoutNodes,
  radiusForDays,
} from "../features/radar/geometry";
import { backupSchema, defaultSettings, type Deadline } from "../types";
const now = new Date(2026, 9, 2, 12);
export const task = (days = 0, extra: Partial<Deadline> = {}): Deadline => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(23, 59);
  return {
    id: "a",
    title: "Test",
    description: "",
    deadlineDate: d.toISOString(),
    startDate: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    status: "active",
    progress: 0,
    priority: "medium",
    category: null,
    color: "#3978bc",
    completedAt: null,
    archived: false,
    ...extra,
  };
};
describe("local date engine", () => {
  it.each([0, 1, 3, 7, 14, 30, 90, 365, -365])("calendar distance %i", (n) =>
    expect(getDaysRemaining(task(n).deadlineDate, now)).toBe(n),
  );
  it("handles leap year and calendar boundary", () => {
    expect(
      getDaysRemaining(
        new Date(2024, 2, 1).toISOString(),
        new Date(2024, 1, 28, 23),
      ),
    ).toBe(2);
    expect(
      getDaysRemaining(
        new Date(2026, 9, 3, 0).toISOString(),
        new Date(2026, 9, 2, 23, 59),
      ),
    ).toBe(1);
  });
  it("handles DST calendar days independent of hours", () => {
    expect(
      getDaysRemaining(
        new Date(2026, 2, 9, 12).toISOString(),
        new Date(2026, 2, 8, 12),
      ),
    ).toBe(1);
  });
  it("at the exact deadline is today, past timestamps overdue", () => {
    const date = now.toISOString();
    expect(isOverdue(date, now)).toBe(false);
    expect(isDueToday(date, now)).toBe(true);
    expect(getTimeRemaining(date, now)).toBe("Due today");
    expect(
      getDeadlineState(
        task(0, { deadlineDate: new Date(+now - 1).toISOString() }),
        now,
      ),
    ).toBe("OVERDUE");
  });
  it("completed overrides lateness", () => {
    expect(
      getDeadlineState(
        task(-2, { status: "completed", completedAt: now.toISOString() }),
        now,
      ),
    ).toBe("COMPLETED");
  });
  it.each([
    [20, "far"],
    [14, "normal"],
    [7, "soon"],
    [3, "critical"],
    [0, "today"],
    [-1, "overdue"],
  ])("urgency %i", (days, urgency) =>
    expect(getUrgency(task(Number(days)).deadlineDate, now)).toBe(urgency),
  );
  it("human readable time", () => {
    expect(getTimeRemaining(task(1).deadlineDate, now)).toBe("Tomorrow");
    expect(getTimeRemaining(task(14).deadlineDate, now)).toBe("14 days left");
    expect(getTimeRemaining(task(-2).deadlineDate, now)).toBe(
      "Overdue by 2 days",
    );
    expect(
      getTimeRemaining(new Date(+now + 59 * 60000).toISOString(), now),
    ).toBe("59 minutes left");
    expect(formatDeadline(task().deadlineDate)).toBeTruthy();
  });
  it("time progress with tolerance and optional start", () => {
    const d = task(5, {
      startDate: new Date(+now - 5 * 86400000).toISOString(),
      deadlineDate: new Date(+now + 5 * 86400000).toISOString(),
      progress: 45,
    });
    expect(getExpectedProgress(d, now)).toBe(50);
    expect(getProgressHealth(d, now)).toBe("On track");
    expect(getProgressHealth({ ...d, progress: 20 }, now)).toBe("Behind");
    expect(getProgressHealth({ ...d, progress: 80 }, now)).toBe("Ahead");
    expect(getExpectedProgress(task(), now)).toBeNull();
    expect(getProgressHealth(task(), now)).toBeNull();
    expect(
      getExpectedProgress({ ...d, startDate: d.deadlineDate }, now),
    ).toBeNull();
  });
});
describe("radar geometry", () => {
  it("linear mapping, clamp, today and overdue zones", () => {
    expect(radiusForDays(30, "30")).toBe(270);
    expect(radiusForDays(90, "30")).toBe(270);
    expect(radiusForDays(0, "30")).toBe(88);
    expect(radiusForDays(1, "30")).toBeGreaterThan(88);
    expect(
      calculateDeadlinePosition({ deadline: task(-1), range: "30", now })
        .radius,
    ).toBe(54);
  });
  it("all range is monotonic and bounded", () => {
    expect(radiusForDays(365, "all")).toBeLessThan(radiusForDays(1825, "all"));
    expect(radiusForDays(100000, "all")).toBe(270);
  });
  it("deterministic regardless of input sort", () => {
    const tasks = Array.from({ length: 20 }, (_, i) =>
      task(0, { id: String(i) }),
    );
    expect(layoutNodes(tasks, "30", now)).toEqual(
      layoutNodes([...tasks].reverse(), "30", now),
    );
    const nodes = layoutNodes(tasks, "30", now);
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++)
        expect(
          Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y),
        ).toBeGreaterThan(15);
  });
  it("handles 500 nodes without losing records", () => {
    const nodes = layoutNodes(
      Array.from({ length: 500 }, (_, i) => task(i % 90, { id: String(i) })),
      "90",
      now,
    );
    expect(nodes).toHaveLength(500);
    expect(nodes.every((n) => Number.isFinite(n.x) && n.radius <= 280)).toBe(
      true,
    );
  });
});
describe("backup validation", () => {
  const b = {
    app: "deadline-radar",
    schemaVersion: 1,
    exportedAt: now.toISOString(),
    deadlines: [task()],
    categories: [],
    settings: defaultSettings,
  };
  it("accepts valid backup and rejects invalid values", () => {
    expect(backupSchema.safeParse(b).success).toBe(true);
    expect(backupSchema.safeParse({ ...b, schemaVersion: 2 }).success).toBe(
      false,
    );
    expect(
      backupSchema.safeParse({ ...b, deadlines: [task(0, { progress: 101 })] })
        .success,
    ).toBe(false);
    expect(
      backupSchema.safeParse({ ...b, deadlines: [task(), task()] }).success,
    ).toBe(false);
    expect(
      backupSchema.safeParse({
        ...b,
        deadlines: [task(0, { category: "missing" })],
      }).success,
    ).toBe(false);
  });
});
