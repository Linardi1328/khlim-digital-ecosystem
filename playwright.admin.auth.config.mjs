import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "admin-authenticated-flows.spec.mjs",
  timeout: 25_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_ADMIN_BASE_URL || "http://127.0.0.1:3002",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "admin-real-mode-mocked", use: { ...devices["Desktop Chrome"] } },
  ],
});
