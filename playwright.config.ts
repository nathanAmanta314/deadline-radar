import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
const localChrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
export default defineConfig({
  testDir: "./e2e",
  timeout: 90000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    launchOptions: {
      executablePath:
        process.env.RADAR_BROWSER ||
        (existsSync(localChrome) ? localChrome : undefined),
    },
    timezoneId: "Asia/Jakarta",
  },
  webServer: {
    command: "npm run preview -- --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
