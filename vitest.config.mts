import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    coverage: {
      provider: "v8",
      include: ["src/server/services/**/*.ts"],
      reporter: ["text", "html"],
      thresholds: { lines: 80 },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["tests/support/integration-global-setup.ts"],
          setupFiles: ["tests/support/integration-env.ts"],
          fileParallelism: false,
        },
      },
    ],
  },
});
