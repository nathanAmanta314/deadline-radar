import { z } from "zod";
const date = z
  .string()
  .datetime({ offset: true })
  .refine((v) => Number.isFinite(Date.parse(v)), "Invalid date");
const color = z.string().regex(/^#[0-9a-f]{6}$/i);
export const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  color,
});
export const deadlineSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().trim().min(1).max(160),
    description: z.string().max(10000),
    deadlineDate: date,
    startDate: date.nullable(),
    createdAt: date,
    updatedAt: date,
    status: z.enum(["active", "completed"]),
    progress: z.number().min(0).max(100),
    priority: z.enum(["low", "medium", "high", "urgent"]),
    category: z.string().nullable(),
    color,
    completedAt: date.nullable(),
    archived: z.boolean(),
  })
  .refine(
    (d) => !d.startDate || Date.parse(d.startDate) < Date.parse(d.deadlineDate),
    "Start must be before deadline",
  )
  .refine(
    (d) => (d.status === "completed") === (d.completedAt !== null),
    "Completion timestamp does not match status",
  );
export const settingsSchema = z.object({
  range: z.enum(["7", "14", "30", "90", "all"]),
  sort: z.enum([
    "nearest",
    "farthest",
    "priority",
    "progress-up",
    "progress-down",
    "recent",
  ]),
  showCompleted: z.boolean(),
  theme: z.enum(["light", "dark", "system"]),
  reducedMotion: z.boolean(),
});
export type Deadline = z.infer<typeof deadlineSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type TemporalState =
  "UPCOMING" | "DUE_SOON" | "DUE_TODAY" | "OVERDUE" | "COMPLETED";
export const defaultSettings: Settings = {
  range: "30",
  sort: "nearest",
  showCompleted: false,
  theme: "light",
  reducedMotion: false,
};
export const backupSchema = z
  .object({
    app: z.literal("deadline-radar"),
    schemaVersion: z.literal(1),
    exportedAt: date,
    deadlines: z.array(deadlineSchema).max(10000),
    categories: z.array(categorySchema).max(1000),
    settings: settingsSchema,
  })
  .superRefine((b, c) => {
    for (const rows of [b.deadlines, b.categories])
      if (new Set(rows.map((r) => r.id)).size !== rows.length)
        c.addIssue({ code: "custom", message: "Duplicate IDs in backup" });
    const ids = new Set(b.categories.map((c) => c.id));
    if (b.deadlines.some((d) => d.category && !ids.has(d.category)))
      c.addIssue({ code: "custom", message: "Unknown category in backup" });
  });
export type Backup = z.infer<typeof backupSchema>;
