import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          exclude: ['src/generated/**'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'integration',
          include: ['test/integration/**/*.int.test.ts'],
          environment: 'node',
          // Integration suites share one SQL Server database: run files one at a time. Vitest 3.2 ignores
          // fileParallelism inside a project (the files ran in parallel); one fork per project does serialize them.
          fileParallelism: false,
          poolOptions: { forks: { singleFork: true } },
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
})
