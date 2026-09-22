import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["src/main.tsx", "src/tests/**/*.test.ts", "src/tests/**/*.test.tsx"],
      include: ["src/**/*.{ts,tsx}"],
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        perFile: true,
        statements: 70,
      },
    },
    environment: "jsdom",
    include: ["src/tests/**/*.test.ts", "src/tests/**/*.test.tsx"],
    setupFiles: ["src/test-setup.ts"],
    testTimeout: 5000,
  },
});
