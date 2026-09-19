import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.browser.ts",
  fullyParallel: true,
  forbidOnly: process.env.CI === "true",
  reporter: "line",
  retries: Number(process.env.CI === "true") * 2,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm preview --host 127.0.0.1 --port 4173",
    reuseExistingServer: process.env.CI !== "true",
    url: "http://127.0.0.1:4173",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
