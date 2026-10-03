import type { Deadline, TemporalState } from "../types";
export const DAY = 86400000;
export const THRESHOLDS = { critical: 3, soon: 7, normal: 14, tolerance: 10 };
const calendarDay = (d: Date) =>
  Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY;
export const getDaysRemaining = (date: string, now = new Date()) =>
  calendarDay(new Date(date)) - calendarDay(now);
export const isOverdue = (date: string, now = new Date()) =>
  Date.parse(date) < now.getTime();
export const isDueToday = (date: string, now = new Date()) =>
  getDaysRemaining(date, now) === 0;
export function getDeadlineState(d: Deadline, now = new Date()): TemporalState {
  if (d.status === "completed") return "COMPLETED";
  if (isOverdue(d.deadlineDate, now)) return "OVERDUE";
  if (isDueToday(d.deadlineDate, now)) return "DUE_TODAY";
  return getDaysRemaining(d.deadlineDate, now) <= THRESHOLDS.soon
    ? "DUE_SOON"
    : "UPCOMING";
}
export function getUrgency(date: string, now = new Date()) {
  if (isOverdue(date, now)) return "overdue";
  const n = getDaysRemaining(date, now);
  return n === 0
    ? "today"
    : n <= THRESHOLDS.critical
      ? "critical"
      : n <= THRESHOLDS.soon
        ? "soon"
        : n <= THRESHOLDS.normal
          ? "normal"
          : "far";
}
export function getTimeRemaining(date: string, now = new Date()) {
  const ms = Date.parse(date) - now.getTime(),
    days = getDaysRemaining(date, now);
  const unit = (n: number, s: string) => `${n} ${s}${n === 1 ? "" : "s"}`;
  if (ms < 0) {
    const m = Math.max(1, Math.floor(-ms / 60000));
    return `Overdue by ${m < 60 ? unit(m, "minute") : m < 1440 ? unit(Math.floor(m / 60), "hour") : unit(Math.max(1, -days), "day")}`;
  }
  if (days === 1) return "Tomorrow";
  if (days > 1) return unit(days, "day") + " left";
  if (ms === 0) return "Due today";
  return ms >= 3600000
    ? unit(Math.ceil(ms / 3600000), "hour") + " left"
    : unit(Math.max(1, Math.ceil(ms / 60000)), "minute") + " left";
}
export const clamp = (n: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, n));
export function getExpectedProgress(
  d: Pick<Deadline, "startDate" | "deadlineDate">,
  now = new Date(),
) {
  if (!d.startDate) return null;
  const duration = Date.parse(d.deadlineDate) - Date.parse(d.startDate);
  return duration <= 0
    ? null
    : clamp((now.getTime() - Date.parse(d.startDate)) / duration) * 100;
}
export function getProgressHealth(d: Deadline, now = new Date()) {
  const expected = getExpectedProgress(d, now);
  if (expected === null) return null;
  const delta = d.progress - expected;
  return delta > THRESHOLDS.tolerance
    ? "Ahead"
    : delta < -THRESHOLDS.tolerance
      ? "Behind"
      : "On track";
}
export const formatDeadline = (date: string) =>
  new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function quickDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localDate(d);
}
export function deadlineInput(date: string) {
  const d = new Date(date);
  return `${localDate(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
