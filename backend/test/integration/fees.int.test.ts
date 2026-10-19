import { AccountFee, FeeTypeView } from '@recon/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createTestApp, SEED_PASSWORD } from './helpers.js'

// Seed oracle (backend/prisma/synthetic.ts): ACCOUNT_FEES (all NULL…NULL) and the 27 FEE_TYPES. Spec fees
// "Fees de la cuenta vigentes a una fecha" and "Catálogo de tipos de fee" (settlement-process).
let ctx: Awaited<ReturnType<typeof createTestApp>>
const accountIds: Record<string, string> = {}
let viewerToken: string

beforeAll(async () => {
  ctx = await createTestApp()
  for (const a of await ctx.prisma.account.findMany({ select: { accountId: true, name: true } }))
    accountIds[a.name] = a.accountId
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { userName: 'viewer', password: SEED_PASSWORD },
  })
  viewerToken = res.json().accessToken
})

afterAll(async () => {
  if (ctx) {
    await ctx.app.close()
    await ctx.prisma.$disconnect()
  }
})

const get = (url: string) =>
  ctx.app.inject({ method: 'GET', url: `/api/v1${url}`, headers: { authorization: `Bearer ${viewerToken}` } })

describe('GET /accounts/{id}/fees against the seed', () => {
  it('ProviderB-Main has one preset: Monthly Fee 250.0000, always', async () => {
    const res = await get(`/accounts/${accountIds['ProviderB-Main']}/fees?transactional=false`)

    expect(res.statusCode, res.body).toBe(200)
    expect(z.array(AccountFee).parse(res.json())).toEqual([
      expect.objectContaining({
        code: 'Monthly Fee',
        isTransactional: false,
        fixedAmount: '250.0000',
        percentage: null,
        startDate: null,
        endDate: null,
      }),
    ])
  })

  it('ProviderA-USD has six transactional fees, MDR as a 10 % percentage', async () => {
    const fees = z
      .array(AccountFee)
      .parse((await get(`/accounts/${accountIds['ProviderA-USD']}/fees?transactional=true&asOf=2026-10-15`)).json())

    expect(fees).toHaveLength(6)
    expect(fees.find((f) => f.code === 'MDR')).toMatchObject({ percentage: '0.100000', fixedAmount: null })
  })

  it('ProviderC-Alt is outside the viewer scope: the same 404 as an unknown account', async () => {
    const outside = await get(`/accounts/${accountIds['ProviderC-Alt']}/fees`)
    const unknown = await get('/accounts/00000000-0000-4000-8000-00000000ffff/fees')

    expect(outside.statusCode).toBe(404)
    expect(outside.json()).toEqual(unknown.json())
  })
})

describe('GET /fee-types against the seed', () => {
  it('lists 27 types; Special Adjustment admits a free amount and Wire Fee does not', async () => {
    const types = z.array(FeeTypeView).parse((await get('/fee-types')).json())

    expect(types).toHaveLength(27)
    expect(types.find((t) => t.code === 'Special Adjustment')?.allowsFreeAmount).toBe(true)
    expect(types.find((t) => t.code === 'Wire Fee')?.allowsFreeAmount).toBe(false)
  })
})
