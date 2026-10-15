// Test-only helpers for the auth HTTP layer: a buildApp() wired to in-memory doubles.
import { vi } from 'vitest'
import { buildApp } from '../../../app.js'
import { loadEnv } from '../../../config/env.js'
import type { PrismaClient } from '../../../generated/prisma/client.js'
import type { CatalogService } from '../../catalog/application/catalog-service.js'
import {
  FakeClock,
  FakePasswordHasher,
  FakeTokenSigner,
  InMemoryAuditLogger,
  InMemoryRefreshTokenStore,
  InMemoryUserRepository,
  MERCHANTS,
  PASSWORD,
  seedUsers,
} from '../application/__fakes__/in-memory.js'
import { AuthService } from '../application/auth-service.js'

export { PASSWORD }

export interface TestAppOptions {
  logLines?: string[]
  /** Catalog service over an in-memory repository; without it the catalog routes hit the fake Prisma client. */
  catalogService?: CatalogService
}

export async function buildTestApp(options: TestAppOptions = {}) {
  const env = loadEnv({ JWT_SECRET: 'unit-test-secret-not-a-real-one-00001', LOG_LEVEL: 'silent' })
  const clock = new FakeClock()
  const users = new InMemoryUserRepository(seedUsers(), MERCHANTS)
  const refreshTokens = new InMemoryRefreshTokenStore()
  const audit = new InMemoryAuditLogger()
  const authService = new AuthService({
    users,
    refreshTokens,
    audit,
    hasher: new FakePasswordHasher(),
    signer: new FakeTokenSigner(clock),
    clock,
    log: { error: vi.fn() },
  })
  const prisma = { $queryRaw: vi.fn(async () => [{ ok: 1 }]), $disconnect: vi.fn() } as unknown as PrismaClient
  const logLines = options.logLines
  const app = await buildApp({
    env: logLines ? { ...env, LOG_LEVEL: 'trace' } : env,
    prisma,
    authService,
    catalogService: options.catalogService,
    logStream: logLines ? { write: (line: string) => void logLines.push(line) } : undefined,
  })
  return { app, clock, users, refreshTokens, audit, authService }
}
