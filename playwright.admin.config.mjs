import { defineConfig, devices } from "@playwright/test";

const DEMO_TEST_MATCH = [
  "admin-ui.spec.mjs",
  "admin-kpi-observability.spec.mjs",
  "admin-governance.spec.mjs",
  "admin-walkthrough-visual.spec.mjs",
  "ric-191-admin-demo-isolation.spec.mjs",
];

const AUTHENTICATED_TEST_MATCH = ["ric-191-admin-registrations.spec.mjs"];

const buildMode = process.env.PLAYWRIGHT_ADMIN_BUILD_MODE || "demo";
if (buildMode !== "demo" && buildMode !== "authenticated") {
  throw new Error(
    `Invalid PLAYWRIGHT_ADMIN_BUILD_MODE="${buildMode}". Expected "demo" or "authenticated".`,
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch:
    buildMode === "authenticated" ? AUTHENTICATED_TEST_MATCH : DEMO_TEST_MATCH,
  timeout: 15_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-admin-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_ADMIN_BASE_URL || "http://127.0.0.1:3002",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "admin-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: "admin-tablet",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "admin-mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
