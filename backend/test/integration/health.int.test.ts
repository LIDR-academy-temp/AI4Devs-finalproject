import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp } from './helpers.js'

let ctx: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  ctx = await createTestApp()
})

afterAll(async () => {
  await ctx?.app.close()
  await ctx?.prisma.$disconnect()
})

describe('GET /api/v1/health', () => {
  it('responds 200 with the database reachable', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/health' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok', db: 'ok' })
  })
})
