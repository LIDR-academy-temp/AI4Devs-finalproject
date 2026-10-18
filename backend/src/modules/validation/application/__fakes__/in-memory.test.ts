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
