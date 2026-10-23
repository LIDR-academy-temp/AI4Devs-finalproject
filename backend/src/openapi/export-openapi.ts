// Renders the OpenAPI contract that the API serves at /docs/json, for docs/openapi.yaml (README §2.3).
import { buildApp } from '../app.js'
import { loadEnv } from '../config/env.js'
import type { PrismaClient } from '../generated/prisma/client.js'

// Only used to build the app in memory; nothing is signed or served with it.
const EXPORT_ONLY_JWT_SECRET = 'openapi-export-only-not-a-secret-000001'

/** Builds the app with a placeholder Prisma client (no database connection) and returns the contract as YAML. */
export async function buildOpenApiDocument(): Promise<string> {
  const env = loadEnv({ JWT_SECRET: EXPORT_ONLY_JWT_SECRET, LOG_LEVEL: 'silent' })
  const prisma = { $disconnect: async () => {} } as unknown as PrismaClient
  const app = await buildApp({ env, prisma })
  try {
    await app.ready()
    return app.swagger({ yaml: true })
  } finally {
    await app.close()
  }
}
