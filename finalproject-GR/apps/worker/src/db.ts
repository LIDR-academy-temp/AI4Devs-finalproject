import { Pool } from 'pg';

/** railgun_worker (ADR 0018): owns nothing, cannot bypass RLS. Defaults to the docker-compose Postgres. */
export const DEFAULT_WORKER_DATABASE_URL = 'postgresql://railgun_worker:worker_dev_password@localhost:5433/railgun';

/**
 * The one pool the worker uses, shared with Graphile Worker itself. A client's error
 * (e.g. the database restarting) is logged instead of crashing the process; the pool
 * replaces the client.
 */
export function createWorkerPool(connectionString = process.env.WORKER_DATABASE_URL ?? DEFAULT_WORKER_DATABASE_URL): Pool {
  const pool = new Pool({ connectionString });
  pool.on('error', (error) => console.error('Idle database client error', error));
  // A checked-out client can error too (Graphile Worker checks for both handlers).
  pool.on('connect', (client) => client.on('error', (error) => console.error('Database client error', error)));
  return pool;
}
