import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { FeeAdminService } from '../../src/modules/fees/application/fee-admin-service.js'
import { FeeOverlapError } from '../../src/modules/fees/domain/errors.js'
import { PrismaFeeAdminRepository } from '../../src/modules/fees/infrastructure/prisma-fee-admin-repository.js'
import { createPrismaClient, fixtureId } from './helpers.js'

// Spec fees "Solapes al administrar fees", scenario "Dos altas simultáneas" (admin-fees design D6): the account lock
// makes the second write wait for the first and then see its fee. A gate holds the first write after its decision and
// before its insert, which is where two writes without the lock would both find no conflict.
const prisma = createPrismaClient()
const ALL = { merchantIds: [1, 2] }
let accountId: string
let adminId: number
let wireFeeTypeId: number
/** The fixture's fees are the Wire Fees of the account starting 2099-01-01: removed before and after, whatever ran. */
const FIXTURE_START = new Date('2099-01-01T00:00:00Z')

async function removeFixture() {
  const fees = await prisma.fee.findMany({
    where: { accountId: fixtureId(accountId, 'accountId'), feeTypeId: wireFeeTypeId, startDate: FIXTURE_START },
    select: { feeId: true },
  })
  const ids = fees.map((f) => f.feeId)
  await prisma.auditLog.deleteMany({
    where: { entityType: 'Fee', entityId: { in: ids.map((id) => id.toLowerCase()) } },
  })
  await prisma.feeHistory.deleteMany({ where: { feeId: { in: ids } } })
  await prisma.fee.deleteMany({ where: { feeId: { in: ids } } })
}

beforeAll(async () => {
  accountId = (await prisma.account.findFirstOrThrow({ where: { name: 'ProviderA-EUR' } })).accountId
  adminId = (await prisma.user.findUniqueOrThrow({ where: { userName: 'admin' } })).userId
  wireFeeTypeId = (await prisma.feeType.findUniqueOrThrow({ where: { code: 'Wire Fee' } })).feeTypeId
  await removeFixture()
})

afterAll(async () => {
  await removeFixture()
  await prisma.$disconnect()
})

function gate() {
  let open!: () => void
  const opened = new Promise<void>((resolve) => {
    open = resolve
  })
  return { open, opened }
}

describe('two simultaneous creations of overlapping fees', () => {
  it('one answers 201 and the other 409 fee_overlap naming the first; one fee stays', async () => {
    const holdFirst = gate()
    const firstDecided = gate()
    let calls = 0
    const repo = new PrismaFeeAdminRepository(prisma, undefined, {
      beforeWrite: async () => {
        if (++calls === 1) {
          firstDecided.open()
          await holdFirst.opened
        }
      },
    })
    const service = new FeeAdminService(repo)
    const body = { feeTypeId: wireFeeTypeId, fixedAmount: '15', startDate: '2099-01-01', endDate: '2099-01-31' }

    const first = service.create(ALL, adminId, accountId, body)
    await firstDecided.opened
    const second = service.create(ALL, adminId, accountId, { ...body, fixedAmount: '16' }).catch((e: unknown) => e)
    // The second write waits on the account lock while the first holds it.
    await new Promise((resolve) => setTimeout(resolve, 500))
    holdFirst.open()

    const fee = await first
    const error = await second
    if (!(error instanceof FeeOverlapError)) throw new Error(`expected 409 fee_overlap, got ${JSON.stringify(error)}`)
    expect(error.details.conflicts.map((c) => c.feeId.toLowerCase())).toEqual([fee.feeId.toLowerCase()])
    expect(
      await prisma.fee.count({
        where: { accountId, feeTypeId: wireFeeTypeId, startDate: FIXTURE_START },
      }),
    ).toBe(1)
  })
})
