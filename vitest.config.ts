import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    // tests/harness son las pruebas en Python de los guardarraíles: no las corre Vitest.
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
  },
});
