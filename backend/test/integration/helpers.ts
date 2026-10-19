import { createHmac } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaMssql } from '@prisma/adapter-mssql'
import { config as loadDotenv } from 'dotenv'
import { buildApp } from '../../src/app.js'
import { loadEnv } from '../../src/config/env.js'
import { PrismaClient } from '../../src/generated/prisma/client.js'
import { mssqlConfigFromEnv } from '../../src/infrastructure/db.js'

// The .env lives at the repository root; CI provides the variables directly.
loadDotenv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.env'), quiet: true })

export const TEST_JWT_SECRET = 'integration-test-secret-not-a-real-one-0001'
export const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'Recon2026!'

/** A Prisma client against the SQL Server of the environment (repository-level integration tests). */
export function createPrismaClient(envOverrides: Record<string, string> = {}): PrismaClient {
  const env = loadEnv({ ...process.env, ...envOverrides, JWT_SECRET: TEST_JWT_SECRET })
  return new PrismaClient({ adapter: new PrismaMssql(mssqlConfigFromEnv(env)) })
}

/**
 * Builds the real app against SQL Server; every log line (level trace) is captured in `logLines`.
 * `envOverrides` win over the process environment (e.g. a temporary UPLOAD_DIR).
 */
export async function createTestApp(envOverrides: Record<string, string> = {}) {
  const env = loadEnv({ ...process.env, ...envOverrides, JWT_SECRET: TEST_JWT_SECRET, LOG_LEVEL: 'trace' })
  const prisma = createPrismaClient(envOverrides)
  const logLines: string[] = []
  const app = await buildApp({ env, prisma, logStream: { write: (line) => void logLines.push(line) } })
  return { app, prisma, logLines }
}

/** Decodes a JWT payload without verifying it. */
export function decodePayload(token: string): Record<string, unknown> {
  const [, payload] = token.split('.')
  return JSON.parse(Buffer.from(payload!, 'base64url').toString('utf8'))
}

/** Signs an HS256 JWT with the given claims, independently of the library used by the app. */
export function signHs256(claims: Record<string, unknown>, secret: string): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
  const head = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(claims)}`
  const signature = createHmac('sha256', secret).update(head).digest('base64url')
  return `${head}.${signature}`
}

/**
 * An id a cleanup filters on. In a Prisma filter an undefined value drops the condition, so a deleteMany of a fixture
 * whose setup failed would empty the whole table: fail instead of deleting.
 */
export function fixtureId<T>(value: T | null | undefined, name: string): T {
  if (value === undefined || value === null) throw new Error(`cleanup refused: ${name} is not defined`)
  return value
}

/** The ids of an `in` filter of a cleanup: the list and each id defined (an empty list deletes nothing). */
export function fixtureIds<T>(values: readonly (T | null | undefined)[] | undefined, name: string): T[] {
  if (values === undefined) throw new Error(`cleanup refused: ${name} is not defined`)
  return values.map((v, i) => fixtureId(v, `${name}[${i}]`))
}
