import { TRANSACTION_STATUSES } from '@recon/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PrismaClient } from '../../src/generated/prisma/client.js'
import { createPrismaClient } from './helpers.js'

// The frontend offers the fixed status of a sheet from the shared constant (there is no status catalog endpoint);
// this suite keeps it aligned with the TransactionStatus rows of the seeded database (web-import, design D6).
let prisma: PrismaClient

beforeAll(() => {
  prisma = createPrismaClient()
})

afterAll(async () => {
  await prisma?.$disconnect()
})

describe('TransactionStatus catalog', () => {
  it('matches TRANSACTION_STATUSES of @recon/shared exactly', async () => {
    const rows = await prisma.transactionStatus.findMany({
      select: { statusId: true, code: true, name: true, cycle: true },
      orderBy: { statusId: 'asc' },
    })

    expect(rows).toEqual(
      TRANSACTION_STATUSES.map(({ statusId, code, name, cycle }) => ({ statusId, code, name, cycle })),
    )
  })
})
