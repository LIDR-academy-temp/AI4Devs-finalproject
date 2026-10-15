import { describe, expect, it, vi } from 'vitest'
import { buildApp } from './app.js'
import { loadEnv } from './config/env.js'
import type { PrismaClient } from './generated/prisma/client.js'

const env = loadEnv({ JWT_SECRET: 'unit-test-secret-not-a-real-one-00001', LOG_LEVEL: 'silent' })

function fakePrisma(queryRaw: () => Promise<unknown>) {
  return { $queryRaw: vi.fn(queryRaw), $disconnect: vi.fn(async () => {}) } as unknown as PrismaClient
}

describe('buildApp', () => {
  it('GET /api/v1/health answers 200 when the database responds', async () => {
    const app = await buildApp({ env, prisma: fakePrisma(async () => [{ ok: 1 }]) })

    const res = await app.inject({ method: 'GET', url: '/api/v1/health' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok', db: 'ok' })
    await app.close()
  })

  it('GET /api/v1/health answers 503 when the database query fails', async () => {
    const app = await buildApp({
      env,
      prisma: fakePrisma(async () => {
        throw new Error('connection refused')
      }),
    })

    const res = await app.inject({ method: 'GET', url: '/api/v1/health' })

    expect(res.statusCode).toBe(503)
    expect(res.json()).toEqual({ status: 'degraded', db: 'error' })
    await app.close()
  })

  it('publishes an OpenAPI 3 document at /docs/json that lists the health route', async () => {
    const app = await buildApp({ env, prisma: fakePrisma(async () => [{ ok: 1 }]) })

    const res = await app.inject({ method: 'GET', url: '/docs/json' })

    expect(res.statusCode).toBe(200)
    const doc = res.json()
    expect(doc.openapi).toMatch(/^3\./)
    expect(doc.paths).toHaveProperty('/api/v1/health')
    await app.close()
  })

  it('does not disconnect an injected Prisma client on close', async () => {
    const prisma = fakePrisma(async () => [{ ok: 1 }])
    const app = await buildApp({ env, prisma })

    await app.close()

    expect(prisma.$disconnect).not.toHaveBeenCalled()
  })
})
