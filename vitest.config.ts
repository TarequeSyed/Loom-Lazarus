import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Two projects: pure TypeScript tests in Node, and React component tests in jsdom.
// Browser tests (Playwright) live in `e2e/` and `src/vision/__tests__/browser/` and are excluded here.
const browserTests = ["e2e/**", "src/vision/__tests__/browser/**", "node_modules/**", "dist/**"];

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
          exclude: browserTests,
        },
      },
      {
        plugins: [react()],
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          exclude: browserTests,
        },
      },
    ],
  },
});