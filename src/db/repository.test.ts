import "fake-indexeddb/auto";
import { beforeEach, it, expect } from "vitest";
import {
  db,
  initialize,
  deadlineRepository,
  categoryRepository,
  importBackup,
  resetData,
} from "./repository";
import { defaultSettings, type Deadline } from "../types";
const date = new Date().toISOString();
const task: Deadline = {
  id: "test",
  title: "Persist me",
  description: "",
  deadlineDate: date,
  startDate: null,
  createdAt: date,
  updatedAt: date,
  status: "active",
  progress: 0,
  priority: "medium",
  category: "work",
  color: "#3978bc",
  completedAt: null,
  archived: false,
};
beforeEach(async () => {
  await db.delete();
  await db.open();
  await initialize();
});
it("persists create, edit, archive, reload and delete", async () => {
  await deadlineRepository.create(task);
  await deadlineRepository.update({ ...task, progress: 45 });
  await deadlineRepository.archive(task.id);
  db.close();
  await db.open();
  expect(await deadlineRepository.getById(task.id)).toMatchObject({
    progress: 45,
    archived: true,
  });
  await deadlineRepository.remove(task.id);
  expect(await deadlineRepository.getAll()).toHaveLength(0);
});
it("category removal preserves task", async () => {
  await deadlineRepository.create(task);
  await categoryRepository.remove("work");
  expect(await deadlineRepository.getById(task.id)).toMatchObject({
    category: null,
  });
});
it("category colors update inherited colors and preserve task overrides", async () => {
  await deadlineRepository.create(task);
  await deadlineRepository.create({ ...task, id: "custom", color: "#abcdef" });
  await categoryRepository.save({
    id: "work",
    name: "Office",
    color: "#123456",
  });
  expect((await deadlineRepository.getById("test"))?.color).toBe("#123456");
  expect((await deadlineRepository.getById("custom"))?.color).toBe("#abcdef");
});
it("merge, replace, invalid import and reset are safe", async () => {
  await deadlineRepository.create(task);
  const backup = {
    app: "deadline-radar" as const,
    schemaVersion: 1 as const,
    exportedAt: date,
    deadlines: [{ ...task, title: "Imported", category: null }],
    categories: [],
    settings: defaultSettings,
  };
  await importBackup(backup, false);
  expect(await deadlineRepository.getAll()).toHaveLength(1);
  expect((await deadlineRepository.getById("test"))?.title).toBe("Imported");
  await expect(
    importBackup({ ...backup, deadlines: [{ ...task, progress: 150 }] }, true),
  ).rejects.toThrow();
  expect(await deadlineRepository.getAll()).toHaveLength(1);
  await importBackup({ ...backup, deadlines: [] }, true);
  expect(await deadlineRepository.getAll()).toHaveLength(0);
  expect(await categoryRepository.getAll()).toHaveLength(0);
  await resetData();
  expect(await categoryRepository.getAll()).toHaveLength(5);
});
