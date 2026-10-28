import { randomUUID } from 'crypto';
import { run } from 'graphile-worker';
import type { Pool } from 'pg';
import { createWorkerPool } from './db';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('worker shutdown', () => {
  let pool: Pool;

  beforeAll(() => {
    pool = createWorkerPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('lets a running job finish on stop(), and takes no further job', async () => {
    // A task name unique to this run, so no other worker on the dev database picks it up.
    const task = `test_wait_${randomUUID().replace(/-/g, '')}`;
    const started: number[] = [];
    const finished: number[] = [];
    let onStart!: () => void;
    const firstStarted = new Promise<void>((resolve) => (onStart = resolve));

    const runner = await run({
      pgPool: pool,
      concurrency: 1,
      noHandleSignals: true,
      pollInterval: 100,
      taskList: {
        [task]: async (payload) => {
          const n = (payload as { n: number }).n;
          started.push(n);
          onStart();
          await sleep(300);
          finished.push(n);
        },
      },
    });

    let stopped = false;
    try {
      await runner.addJob(task, { n: 1 });
      await runner.addJob(task, { n: 2 }, { runAt: new Date(Date.now() + 200) });
      await firstStarted;

      await runner.stop();
      stopped = true;

      expect(finished).toEqual([1]);
      expect(started).toEqual([1]);
    } finally {
      if (!stopped) {
        await runner.stop();
      }
      await pool.query(`DELETE FROM graphile_worker._private_jobs j USING graphile_worker._private_tasks t
        WHERE j.task_id = t.id AND t.identifier = $1`, [task]);
      await pool.query('DELETE FROM graphile_worker._private_tasks WHERE identifier = $1', [task]);
    }
  });
});
