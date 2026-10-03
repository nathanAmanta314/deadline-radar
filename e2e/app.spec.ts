import { test, expect } from "@playwright/test";
test("full local-first workflow, backup and offline", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Got it" }).click();
  await page
    .getByRole("button", { name: "Add deadline", exact: false })
    .first()
    .click();
  await page.getByLabel("Title", { exact: true }).fill("QA deadline");
  await page.getByLabel("Description").fill("Searchable acceptance scenario");
  await page.getByRole("button", { name: "+3 days", exact: true }).click();
  await page.getByRole("button", { name: "Save deadline" }).click();
  await expect(
    page.getByRole("button", { name: /QA deadline/ }).last(),
  ).toBeVisible();
  await page.reload();
  await page
    .locator(".deadline-card")
    .filter({ hasText: "QA deadline" })
    .click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("QA edited");
  await page.getByRole("button", { name: "Save deadline" }).click();
  await expect(page.getByRole("dialog")).toContainText("QA edited");
  await page.getByRole("button", { name: "Reschedule", exact: true }).click();
  await page.getByRole("button", { name: "Tomorrow", exact: true }).click();
  await page.locator(".deadline-card").filter({ hasText: "QA edited" }).click();
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await expect(page.locator(".deadline-card")).toHaveCount(2);
  await page.locator(".deadline-card").filter({ hasText: "(copy)" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm delete", exact: true })
    .click();
  await expect(page.locator(".deadline-card")).toHaveCount(1);
  await page.getByLabel("Search deadlines").fill("missing");
  await expect(page.getByText("No deadlines match your search.")).toBeVisible();
  await page.getByLabel("Search deadlines").fill("Searchable");
  await expect(page.locator(".deadline-card")).toHaveCount(1);
  await page.getByLabel("Search deadlines").fill("");
  await page.getByRole("button", { name: "7d", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "7d", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.locator(".deadline-card").click();
  await page.getByRole("button", { name: "Mark completed" }).click();
  await expect(page.locator(".deadline-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await page.locator(".deadline-card").click();
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await page
    .locator("nav")
    .getByRole("link", { name: /Archive/ })
    .click();
  await page.locator(".deadline-card").click();
  await page.getByRole("button", { name: "Restore from archive" }).click();
  await expect(page.locator(".deadline-card")).toHaveCount(0);
  await page.locator("nav").getByRole("link", { name: "Settings" }).click();
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "New category" }).click();
  await page.getByLabel("Name", { exact: true }).fill("QA category");
  await page.getByRole("button", { name: "Save category" }).click();
  await expect(page.getByText("QA category", { exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  await page.getByRole("button", { name: "Reset all data" }).click();
  await page.getByLabel("Type RESET to confirm").fill("RESET");
  await page.getByRole("button", { name: "Permanently reset" }).click();
  await expect(page.getByRole('dialog',{name:'Reset all data?'})).toHaveCount(0);
  await page.locator("input[type=file]").setInputFiles(path!);
  await expect(page.getByRole("dialog")).toContainText("1 deadlines");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Import backup" })
    .click();
  await expect(page.getByText("QA category", { exact: true })).toBeVisible();
  await page.locator("nav").getByRole("link", { name: "Overview" }).click();
  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await expect(page.locator(".deadline-card")).toHaveCount(1);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "See what’s getting closer." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Add deadline/ })
    .first()
    .click();
  await page.getByLabel("Title", { exact: true }).fill("Offline task");
  await page.getByRole("button", { name: "Save deadline" }).click();
  await page.getByRole("button", { name: "All", exact: true }).last().click();
  await expect(
    page.locator(".deadline-card").filter({ hasText: "Offline task" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("responsive radar, all ranges, themes, keyboard and demo", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Got it" }).click();
  await page.getByRole("button", { name: "Load demo data" }).click();
  await expect(page.locator(".deadline-card")).toHaveCount(5);
  for (const range of ["7d", "14d", "30d", "90d", "All"]) {
    await page
      .locator(".segmented")
      .getByRole("button", { name: range, exact: true })
      .click();
    await expect(page.locator(".radar-node")).toHaveCount(5);
  }
  await page
    .locator(".segmented")
    .getByRole("button", { name: "30d", exact: true })
    .click();
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.locator(".radar")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `../../work/radar-${width}.png`,
      fullPage: true,
    });
  }
  await page.locator(".radar-node").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.keyboard.press("n");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator("nav").getByRole("link", { name: "Settings" }).click();
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("dark");
  await page.locator("nav").getByRole("link", { name: "Overview" }).click();
  await expect(page.locator(".radar")).toBeVisible();
  await page.screenshot({ path: "../../work/radar-dark.png", fullPage: true });
  await page.getByLabel("Filter priority").selectOption("urgent");
  await expect(page.locator(".deadline-card")).toHaveCount(2);
  await expect(page.locator(".radar-node")).toHaveCount(2);
});

test("invalid backup, replace confirmation, category edits, and mobile form", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Load demo data" }).click();
  await expect(page.locator(".deadline-card")).toHaveCount(5);
  await page.locator("nav").getByRole("link", { name: "Settings" }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from("{bad json"),
    });
  await expect(page.getByRole("alert")).toContainText("not a valid");
  const work = page.locator(".category-list>div").filter({ hasText: "Work" });
  await work.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Office");
  await page.getByRole("button", { name: "Save category" }).click();
  await page
    .locator(".category-list>div")
    .filter({ hasText: "Office" })
    .getByRole("button", { name: "Delete" })
    .click();
  await page.getByRole("button", { name: "Confirm delete category" }).click();
  const backup = {
    app: "deadline-radar",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    deadlines: [],
    categories: [],
    settings: {
      range: "30",
      sort: "nearest",
      showCompleted: false,
      theme: "light",
      reducedMotion: false,
    },
  };
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "valid.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
  await page
    .getByRole("combobox", { name: "Import mode" })
    .selectOption("replace");
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Import backup" }),
  ).toBeDisabled();
  await page.getByLabel("Type REPLACE to confirm").fill("REPLACE");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Import backup" })
    .click();
  await page.locator("nav").getByRole("link", { name: "Overview" }).click();
  await expect(page.getByText("Your radar is clear.")).toBeVisible();
  await page.getByRole("button", { name: "Add deadline", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Mobile deadline");
  await page.getByRole("button", { name: "Save deadline" }).click();
  await expect(page.locator(".deadline-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".deadline-card")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
