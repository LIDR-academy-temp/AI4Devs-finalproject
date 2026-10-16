// Test-only helper for the HTTP layer of every module: buildApp() wired to in-memory doubles
// (auth always; catalog and imports when the test injects them).
import { vi } from 'vitest'
import { buildApp } from '../app.js'
import { loadEnv } from '../config/env.js'
import type { PrismaClient } from '../generated/prisma/client.js'
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
} from '../modules/auth/application/__fakes__/in-memory.js'
import { AuthService } from '../modules/auth/application/auth-service.js'
import type { CatalogService } from '../modules/catalog/application/catalog-service.js'
import type { ImportService } from '../modules/imports/application/import-service.js'
import type { FileStore } from '../modules/imports/application/ports.js'

export { PASSWORD }

export interface TestAppOptions {
  logLines?: string[]
  /** Catalog service over an in-memory repository; without it the catalog routes hit the fake Prisma client. */
  catalogService?: CatalogService
  /** Import service and the file store it shares with the routes; without them the import routes hit the fake Prisma client. */
  imports?: { service: ImportService; files: FileStore }
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
    imports: options.imports,
    logStream: logLines ? { write: (line: string) => void logLines.push(line) } : undefined,
  })
  return { app, clock, users, refreshTokens, audit, authService }
}
