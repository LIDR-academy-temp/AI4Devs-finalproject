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

  it('publishes the nine catalog routes with bearer security, the catalog tag and unassigned as true/false', async () => {
    const app = await buildApp({ env, prisma: fakePrisma(async () => [{ ok: 1 }]) })

    const res = await app.inject({ method: 'GET', url: '/docs/json' })

    expect(res.statusCode).toBe(200)
    const doc = res.json()
    const catalogPaths = [
      '/api/v1/merchants',
      '/api/v1/merchants/{merchantId}/providers',
      '/api/v1/providers/{providerId}',
      '/api/v1/providers/{providerId}/channels',
      '/api/v1/providers/{providerId}/accounts',
      '/api/v1/accounts/{accountId}',
      '/api/v1/accounts/{accountId}/channels',
      '/api/v1/channels',
      '/api/v1/channels/{channelId}/accounts',
    ]
    for (const path of catalogPaths) {
      const operation = doc.paths[path]?.get
      expect(operation, path).toBeDefined()
      expect(operation.tags, path).toEqual(['catalog'])
      expect(operation.security, path).toEqual([{ bearerAuth: [] }])
      expect(operation.responses, path).toHaveProperty('401')
    }
    const unassigned = doc.paths['/api/v1/channels'].get.parameters.find(
      (p: { name: string }) => p.name === 'unassigned',
    )
    expect(unassigned).toMatchObject({ in: 'query', required: false })
    // The wire format is a string: the document must say which two values are accepted.
    expect(unassigned.schema).toEqual({ type: 'string', enum: ['true', 'false'] })
    await app.close()
  })

  it('does not disconnect an injected Prisma client on close', async () => {
    const prisma = fakePrisma(async () => [{ ok: 1 }])
    const app = await buildApp({ env, prisma })

    await app.close()

    expect(prisma.$disconnect).not.toHaveBeenCalled()
  })
})
