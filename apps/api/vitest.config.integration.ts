import { defineConfig } from 'vitest/config';

// Tests de integración contra la base de datos de test (DATABASE_URL_TEST).
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.int-spec.ts'],
    setupFiles: ['./test/setup-env.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
