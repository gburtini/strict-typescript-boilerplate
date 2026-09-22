import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/__tests__/**/*.integration.ts"],
    passWithNoTests: true,
    testTimeout: 30_000,
  },
});
