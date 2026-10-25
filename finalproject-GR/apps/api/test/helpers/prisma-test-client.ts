import { PrismaClient } from '@prisma/client';

/**
 * A PrismaClient for integration tests, connected as railgun_app (never as the
 * migration role) — tests must exercise the same restricted role production code runs
 * under. Defaults to the local docker-compose Postgres; override with DATABASE_URL.
 */
export function createTestPrismaClient(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL ?? 'postgresql://railgun_app:app_dev_password@localhost:5433/railgun';
  return new PrismaClient({ datasources: { db: { url: connectionString } } });
}
