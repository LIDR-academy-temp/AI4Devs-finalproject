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

/** Builds the real app against SQL Server; every log line (level trace) is captured in `logLines`. */
export async function createTestApp() {
  const env = loadEnv({ ...process.env, JWT_SECRET: TEST_JWT_SECRET, LOG_LEVEL: 'trace' })
  const prisma = new PrismaClient({ adapter: new PrismaMssql(mssqlConfigFromEnv(env)) })
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
