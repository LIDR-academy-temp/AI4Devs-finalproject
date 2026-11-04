import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { AccountAdminService } from '../../src/modules/accounts/application/account-admin-service.js'
import { AccountNameTakenError } from '../../src/modules/accounts/domain/errors.js'
import { PrismaAccountAdminRepository } from '../../src/modules/accounts/infrastructure/prisma-account-admin-repository.js'
import { CatalogService } from '../../src/modules/catalog/application/catalog-service.js'
import { PrismaCatalogRepository } from '../../src/modules/catalog/infrastructure/prisma-catalog-repository.js'
import { FeeAdminService } from '../../src/modules/fees/application/fee-admin-service.js'
import { PrismaFeeAdminRepository } from '../../src/modules/fees/infrastructure/prisma-fee-admin-repository.js'
import { createPrismaClient, fixtureId, fixtureIds } from './helpers.js'

// Spec accounts "Nombre de cuenta único en todo el sistema" ("Dos altas simultáneas con el mismo nombre") and spec fees
// "Copia de fees al crear cuenta" ("Copia y cambio de fee simultáneos"), admin-accounts design D4 and D5. A gate holds
// the first write after its decision and before its first insert.
const prisma = createPrismaClient()
const ALL = { merchantIds: [1, 2] }
const RUN = Date.now().toString(36)
const PREFIX = `it-acc-conc-${RUN}`
/** The change from a date of the source fee: far in the future, undone after the test. */
const EFFECTIVE_FROM = '2099-06-01'
let adminId: number
let sourceAccountId: string
let sourceFeeId: string
let catalog: CatalogService

/** The seed's Chargeback fee of ProviderC-USD as the test found it: the row, its history, its audit and its type's fees. */
async function sourceSnapshot() {
  const source = fixtureId(sourceFeeId, 'source fee')
  return {
    row: await prisma.fee.findUniqueOrThrow({ where: { feeId: source } }),
    historyIds: (
      await prisma.feeHistory.findMany({
        where: { feeId: source },
        select: { feeHistoryId: true },
        orderBy: { feeHistoryId: 'asc' },
      })
    ).map((h) => h.feeHistoryId),
    auditIds: (
      await prisma.auditLog.findMany({
        where: { entityType: 'Fee', entityId: source.toLowerCase() },
        select: { auditId: true },
        orderBy: { auditId: 'asc' },
      })
    ).map((a) => a.auditId),
    feesOfType: await prisma.fee.count({ where: { accountId: sourceAccountId, feeTypeId: 4 } }),
  }
}
let before: Awaited<ReturnType<typeof sourceSnapshot>>
/** The last history and audit ids before this file wrote anything: cleanup only removes rows above them. */
let lastHistoryId: number
let lastAuditId: bigint

beforeAll(async () => {
  adminId = (await prisma.user.findUniqueOrThrow({ where: { userName: 'admin' } })).userId
  sourceAccountId = (await prisma.account.findFirstOrThrow({ where: { name: 'ProviderC-USD' } })).accountId
  sourceFeeId = (
    await prisma.fee.findFirstOrThrow({
      where: { accountId: sourceAccountId, feeTypeId: 4 },
      orderBy: { feeId: 'asc' },
    })
  ).feeId
  catalog = new CatalogService(new PrismaCatalogRepository(prisma))
  before = await sourceSnapshot()
  lastHistoryId = (await prisma.feeHistory.aggregate({ _max: { feeHistoryId: true } }))._max.feeHistoryId ?? 0
  lastAuditId = (await prisma.auditLog.aggregate({ _max: { auditId: true } }))._max.auditId ?? 0n
})

/** Removes the accounts of this file and undoes the change from a date of the source fee. */
afterEach(async () => {
  const accounts = await prisma.account.findMany({
    where: { name: { startsWith: PREFIX } },
    select: { accountId: true },
  })
  const ids = fixtureIds(
    accounts.map((a) => a.accountId),
    'concurrency accounts',
  )
  const feeIds = (await prisma.fee.findMany({ where: { accountId: { in: ids } }, select: { feeId: true } })).map(
    (f) => f.feeId,
  )
  await prisma.auditLog.deleteMany({
    where: { entityType: 'Account', entityId: { in: ids.map((id) => id.toLowerCase()) } },
  })
  await prisma.feeHistory.deleteMany({ where: { feeId: { in: feeIds } } })
  await prisma.fee.deleteMany({ where: { accountId: { in: ids } } })
  await prisma.account.deleteMany({ where: { accountId: { in: ids } } })

  const source = fixtureId(sourceFeeId, 'source fee')
  const successors = await prisma.fee.findMany({
    where: { accountId: sourceAccountId, startDate: new Date(`${EFFECTIVE_FROM}T00:00:00Z`) },
    select: { feeId: true },
  })
  const touched = [source, ...successors.map((s) => s.feeId)]
  await prisma.auditLog.deleteMany({
    where: { entityType: 'Fee', entityId: { in: touched.map((id) => id.toLowerCase()) }, auditId: { gt: lastAuditId } },
  })
  await prisma.feeHistory.deleteMany({ where: { feeId: { in: touched }, feeHistoryId: { gt: lastHistoryId } } })
  await prisma.fee.deleteMany({ where: { feeId: { in: successors.map((s) => s.feeId) } } })
  // updatedAt too: the row must be byte for byte the seed's again.
  await prisma.fee.update({
    where: { feeId: source },
    data: { endDate: before.row.endDate, updatedAt: before.row.updatedAt },
  })
})

afterAll(async () => {
  try {
    // The seed is left exactly as found: the source fee, no successor, no history or audit added, no it-acc account.
    expect(await sourceSnapshot()).toEqual(before)
    expect(await prisma.account.count({ where: { name: { startsWith: 'it-acc-' } } })).toBe(0)
  } finally {
    await prisma.$disconnect()
  }
})

function gate() {
  let open!: () => void
  const opened = new Promise<void>((resolve) => {
    open = resolve
  })
  return { open, opened }
}

/** A service whose first write stops after its decision until `hold` opens; `decided` opens when it gets there. */
function heldService() {
  const hold = gate()
  const decided = gate()
  let calls = 0
  const repo = new PrismaAccountAdminRepository(prisma, undefined, {
    beforeWrite: async () => {
      if (++calls === 1) {
        decided.open()
        await hold.opened
      }
    },
  })
  return { service: new AccountAdminService(repo, catalog), hold, decided }
}

describe('two simultaneous creations with the same name', () => {
  it('one answers 201 and the other 409 account_name_taken; one account stays', async () => {
    const { service, hold, decided } = heldService()
    const body = { name: `${PREFIX}-same`, chargebackReservePolicy: 'hold_until_term' as const }

    const first = service.create(ALL, adminId, 201, body).catch((e: unknown) => e)
    await decided.opened
    // The second decides after the first and inserts while the first is held: both passed the check.
    const second = await service
      .create(ALL, adminId, 201, body)
      .catch((e: unknown) => e)
      .finally(() => hold.open())
    const outcomes = [second, await first]

    expect(outcomes.filter((o) => o instanceof AccountNameTakenError)).toHaveLength(1)
    expect(outcomes.filter((o) => (o as { name?: string }).name === body.name)).toHaveLength(1)
    expect(await prisma.account.count({ where: { name: body.name } })).toBe(1)
  })
})

describe('a copy of fees and a change of a source fee at the same time', () => {
  it('the change waits for the copy, and the new account has one fee per type', async () => {
    const { service, hold, decided } = heldService()
    const fees = new FeeAdminService(new PrismaFeeAdminRepository(prisma))
    const events: string[] = []

    const copy = service
      .create(ALL, adminId, 201, {
        name: `${PREFIX}-copy`,
        chargebackReservePolicy: 'hold_until_term',
        copyFeesFromAccountId: sourceAccountId,
      })
      .then((account) => {
        events.push('copy')
        return account
      })
    await decided.opened
    const change = fees
      .patch(ALL, adminId, sourceFeeId, { effectiveFrom: EFFECTIVE_FROM, fixedAmount: '41' })
      .then(() => events.push('change'))
    // The change waits on the source account lock while the copy holds it.
    await new Promise((resolve) => setTimeout(resolve, 500))
    const duringHold = [...events]
    // Always release the copy, so a failure never leaves its transaction waiting on the gate.
    hold.open()
    const account = await copy
    await change

    expect(duringHold).toEqual([])
    expect(events).toEqual(['copy', 'change'])
    const copied = await prisma.fee.findMany({ where: { accountId: account.accountId }, select: { feeTypeId: true } })
    expect(copied.map((f) => f.feeTypeId).sort()).toEqual([1, 2, 3, 4, 5])
  })
})
