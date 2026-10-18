import { describe, expect, it } from 'vitest'
import { ACCOUNT_IDS } from '../../../catalog/application/__fakes__/in-memory.js'
import { STATUS } from '../../test-support/builders.js'
import { accountScopeOf, InMemoryValidationSources, type StoredBatch, validationWorld } from './in-memory.js'

// The history double keeps the contract of the Prisma adapter (design D3): attempts with status <> 'undone' of every
// account of the provider, never the import being validated.
const PROVIDER_A = accountScopeOf('ProviderA-USD').providerId

function batch(overrides: Partial<StoredBatch>): StoredBatch {
  return {
    batchId: 'extra-batch',
    accountId: ACCOUNT_IDS['ProviderA-USD'],
    batchNo: 999,
    attemptNo: 1,
    status: 'processed',
    importId: 'extra-import',
    movements: [
      {
        transactionId: 1n,
        cycle: 'E',
        statusId: STATUS.Successful,
        excludeAmount: false,
        sheetId: null,
        rowNo: null,
        reserveHeldAmt: '0.0000',
        reserveEarlyReleasedAmt: '0.0000',
      },
    ],
    ...overrides,
  }
}

describe('InMemoryValidationSources.movements', () => {
  it('brings the history of every account of the provider (USD and EUR for Provider A)', async () => {
    const world = validationWorld()
    const ids = world.batches
      .filter((b) => b.accountId === ACCOUNT_IDS['ProviderA-USD'] || b.accountId === ACCOUNT_IDS['ProviderA-EUR'])
      .map((b) => b.movements[0]!.transactionId)

    const accounts = new Set(
      (await new InMemoryValidationSources().movements(PROVIDER_A, ids, 'import-now')).map((m) => m.accountId),
    )

    expect(accounts).toEqual(new Set([ACCOUNT_IDS['ProviderA-USD'], ACCOUNT_IDS['ProviderA-EUR']]))
  })

  it('never brings movements of another provider', async () => {
    const providerB = validationWorld()
      .batches.filter((b) => b.accountId === ACCOUNT_IDS['ProviderB-Main'])
      .map((b) => b.movements[0]!.transactionId)

    expect(await new InMemoryValidationSources().movements(PROVIDER_A, providerB, 'import-now')).toEqual([])
  })

  it('leaves out an undone attempt and the import being validated', async () => {
    const sources = new InMemoryValidationSources()
    sources.addBatch(batch({ batchId: 'undone', status: 'undone', importId: 'old-import' }))
    sources.addBatch(batch({ batchId: 'mine', status: 'processed', importId: 'import-now' }))
    sources.addBatch(batch({ batchId: 'live', status: 'processed', importId: 'other-import' }))

    const batches = (await sources.movements(PROVIDER_A, [1n], 'import-now')).map((m) => m.batchId)

    expect(batches).toContain('live')
    expect(batches).not.toContain('undone')
    expect(batches).not.toContain('mine')
  })
})

describe('InMemoryValidationSources.registered (L7)', () => {
  // Same contract as the port: persistent findings of non-superseded runs of imports with a processed or paid batch.
  const settledImport = validationWorld().batches.find((b) => b.accountId === ACCOUNT_IDS['ProviderA-USD'])!.importId

  it('keeps a persistent finding of a live run and drops a resolved one and one of a superseded run', async () => {
    const sources = new InMemoryValidationSources()
    sources.registerMissing({ providerId: PROVIDER_A, cycle: 'E', transactionId: 1n, importId: settledImport })
    sources.registerMissing({
      providerId: PROVIDER_A,
      cycle: 'E',
      transactionId: 2n,
      importId: settledImport,
      resolutionStatus: 'resolved',
    })
    sources.registerMissing({
      providerId: PROVIDER_A,
      cycle: 'E',
      transactionId: 3n,
      importId: settledImport,
      runSuperseded: true,
    })

    expect(await sources.registered(PROVIDER_A)).toEqual(new Set(['E:1']))
  })
})

describe('InMemoryValidationSources.candidates (M2)', () => {
  it('returns an I candidate without lastStatusChangedAt, so the engine can count it in undatedCandidateCount', async () => {
    const sources = new InMemoryValidationSources()
    const account = accountScopeOf('ProviderB-Main')
    sources.addTransaction({
      transactionId: 9_000_001n,
      sourceTransactionId: '900000000000001',
      providerId: account.providerId,
      channelId: 1011,
      statusId: STATUS.Chargeback,
      transactionDate: new Date('2026-09-01T00:00:00.000Z'),
      lastStatusChangedAt: null,
    })
    const at = new Date('2026-10-01T00:00:00.000Z')

    const candidates = await sources.candidates(account, { APP: null, DEC: null, I: { min: at, max: at }, R: null })

    expect(candidates.find((c) => c.transactionId === 9_000_001n)).toMatchObject({ lastStatusChangedAt: null })
  })
})

describe('InMemoryValidationSources.heldReserves (M1)', () => {
  it('filters by the same expiry as the engine: creation + the current rollingReserveDays of the channel (120 d)', async () => {
    const sources = new InMemoryValidationSources()
    const account = { ...accountScopeOf('ProviderB-Main'), primaryChannelIds: new Set([1013]) }
    const created = new Date('2026-06-01T00:00:00.000Z')
    const expiry = new Date(created.getTime() + 120 * 86_400_000)
    sources.addTransaction({
      transactionId: 9_000_002n,
      sourceTransactionId: '900000000000002',
      providerId: account.providerId,
      channelId: 1013,
      statusId: STATUS.Successful,
      transactionDate: created,
      lastStatusChangedAt: null,
    })
    sources.addBatch({
      batchId: 'held-120',
      accountId: account.accountId,
      batchNo: 90,
      attemptNo: 1,
      status: 'paid',
      importId: 'import-held-120',
      movements: [
        {
          transactionId: 9_000_002n,
          cycle: 'E',
          statusId: STATUS.Successful,
          excludeAmount: false,
          sheetId: null,
          rowNo: null,
          reserveHeldAmt: '5.0000',
          reserveEarlyReleasedAmt: '0.0000',
        },
      ],
    })
    const ids = async (rMax: Date) => (await sources.heldReserves(account, rMax)).map((r) => r.transactionId)

    expect(await ids(expiry)).toContain(9_000_002n)
    expect(await ids(new Date(expiry.getTime() - 1))).not.toContain(9_000_002n)
  })
})
