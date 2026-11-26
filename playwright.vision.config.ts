import { defineConfig, devices } from "@playwright/test";

// Detection browser harness (card-detection task 28.2). Served by the Vite dev server;
// this is a test fixture, not product UI.
export default defineConfig({
  testDir: "src/vision/__tests__/browser",
  reporter: [["list"]],
  use: { baseURL: "http://localhost:5174", trace: "retain-on-failure" },
  webServer: {
    command: "npx vite --port 5174 --strictPort",
    url: "http://localhost:5174",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "vision-harness", use: { ...devices["Desktop Chrome"] } }],
});