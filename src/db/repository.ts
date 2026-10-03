import Dexie, { type Table } from "dexie";
import {
  deadlineSchema,
  categorySchema,
  backupSchema,
  type Deadline,
  type Category,
  type Backup,
} from "../types";
class RadarDB extends Dexie {
  deadlines!: Table<Deadline, string>;
  categories!: Table<Category, string>;
  meta!: Table<{ key: string; value: boolean }, string>;
  constructor() {
    super("deadline-radar");
    this.version(1).stores({
      deadlines: "id,deadlineDate,category,status",
      categories: "id",
      meta: "key",
    });
  }
}
export const db = new RadarDB();
export const defaultCategories: Category[] = [
  ["work", "Work", "#3978bc"],
  ["personal", "Personal", "#a66a34"],
  ["study", "Study", "#8b65bf"],
  ["freelance", "Freelance", "#278577"],
  ["portfolio", "Portfolio", "#c76185"],
].map(([id, name, color]) => ({ id, name, color }));
export async function initialize() {
  await db.transaction("rw", db.meta, db.categories, async () => {
    if (!(await db.meta.get("initialized"))) {
      await db.categories.bulkPut(defaultCategories);
      await db.meta.put({ key: "initialized", value: true });
    }
  });
}
export const deadlineRepository = {
  getAll: () => db.deadlines.toArray(),
  getById: (id: string) => db.deadlines.get(id),
  create: (d: Deadline) => db.deadlines.add(deadlineSchema.parse(d)),
  update: (d: Deadline) => db.deadlines.put(deadlineSchema.parse(d)),
  remove: (id: string) => db.deadlines.delete(id),
  archive: async (id: string, archived = true) => {
    const d = await db.deadlines.get(id);
    if (d)
      await db.deadlines.put({
        ...d,
        archived,
        updatedAt: new Date().toISOString(),
      });
  },
};
export const categoryRepository = {
  getAll: () => db.categories.toArray(),
  save: (input: Category) =>
    db.transaction("rw", db.categories, db.deadlines, async () => {
      const c = categorySchema.parse(input);
      const previous = await db.categories.get(c.id);
      await db.categories.put(c);
      if (previous && previous.color !== c.color) {
        // Keep explicit task color overrides while updating inherited category colors.
        await db.deadlines
          .where("category")
          .equals(c.id)
          .modify((d) => {
            if (d.color === previous.color) {
              d.color = c.color;
              d.updatedAt = new Date().toISOString();
            }
          });
      }
    }),
  remove: (id: string) =>
    db.transaction("rw", db.categories, db.deadlines, async () => {
      await db.deadlines
        .where("category")
        .equals(id)
        .modify({ category: null, updatedAt: new Date().toISOString() });
      await db.categories.delete(id);
    }),
};
export async function importBackup(input: Backup, replace: boolean) {
  const b = backupSchema.parse(input);
  await db.transaction("rw", db.deadlines, db.categories, async () => {
    if (replace) {
      await db.deadlines.clear();
      await db.categories.clear();
    }
    await db.categories.bulkPut(b.categories);
    await db.deadlines.bulkPut(b.deadlines);
  });
}
export async function resetData() {
  await db.transaction("rw", db.deadlines, db.categories, async () => {
    await db.deadlines.clear();
    await db.categories.clear();
    await db.categories.bulkPut(defaultCategories);
  });
}
