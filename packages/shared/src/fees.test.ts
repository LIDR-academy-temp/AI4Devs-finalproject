import { describe, expect, it } from 'vitest'
import {
  AccountFee,
  AccountFeesQuery,
  FeeCreate,
  FeeHistoryEntry,
  FeeHistoryQuery,
  FeeInUseDetails,
  FeeListItem,
  FeeOverlapDetails,
  FeePage,
  FeePatch,
  FeesQuery,
  FeeTypeView,
  FeeUpdateResult,
} from './fees.js'

const fee = {
  feeId: '0b6f4c1e-1a2b-4c3d-8e4f-000000000005',
  feeTypeId: 111,
  code: 'Monthly Fee',
  title: 'Monthly Fee',
  isTransactional: false,
  fixedAmount: '250.0000',
  percentage: null,
  conditionalPercentage: null,
  conditionThresholdAmt: null,
  brandFixedAmount: null,
  brandPercentage: null,
  startDate: null,
  endDate: null,
  description: null,
  status: 'active',
  inUse: true,
  lastAppliedEventDate: '2026-10-15',
  createdBy: { userId: 1, userName: 'admin' },
  createdAt: '2026-10-01T14:02:11.000Z',
  updatedAt: '2026-10-01T14:02:11.000Z',
}

// Reads for Settlement Review (settlement-process, spec fees "Fees de la cuenta vigentes a una fecha").
describe('AccountFee', () => {
  it('parses a preset with open validity ("always")', () => {
    expect(AccountFee.safeParse(fee).success).toBe(true)
  })

  it('takes a percentage-only preset, without a computed amount (P9)', () => {
    expect(AccountFee.safeParse({ ...fee, fixedAmount: null, percentage: '0.010000' }).success).toBe(true)
  })

  it('rejects money as a JSON number and dates that are not YYYY-MM-DD', () => {
    expect(AccountFee.safeParse({ ...fee, fixedAmount: 250 }).success).toBe(false)
    expect(AccountFee.safeParse({ ...fee, startDate: '2026-11-01T00:00:00.000Z' }).success).toBe(false)
  })

  // admin-fees D2: additive fields.
  it('carries the variants, status, usage and authorship', () => {
    const parsed = AccountFee.parse({ ...fee, conditionalPercentage: '0.020000', conditionThresholdAmt: '0.0100' })
    expect(parsed.conditionalPercentage).toBe('0.020000')
    expect(parsed.lastAppliedEventDate).toBe('2026-10-15')
  })

  it('has no last applied event when the fee is not in use', () => {
    expect(AccountFee.safeParse({ ...fee, inUse: false, lastAppliedEventDate: null }).success).toBe(true)
  })

  it('only knows the three statuses', () => {
    expect(AccountFee.safeParse({ ...fee, status: 'scheduled' }).success).toBe(true)
    expect(AccountFee.safeParse({ ...fee, status: 'closed' }).success).toBe(true)
    expect(AccountFee.safeParse({ ...fee, status: 'withdrawn' }).success).toBe(false)
  })
})

describe('AccountFeesQuery', () => {
  it('reads transactional as true or false and asOf as a business date', () => {
    expect(AccountFeesQuery.parse({ transactional: 'false', asOf: '2026-10-15' })).toEqual({
      transactional: false,
      asOf: '2026-10-15',
    })
    expect(AccountFeesQuery.parse({})).toEqual({})
  })

  it('rejects other values', () => {
    expect(AccountFeesQuery.safeParse({ transactional: 'no' }).success).toBe(false)
    expect(AccountFeesQuery.safeParse({ asOf: '15/10/2026' }).success).toBe(false)
  })
})

describe('FeeTypeView', () => {
  it('parses a free-amount category', () => {
    expect(
      FeeTypeView.safeParse({
        feeTypeId: 119,
        code: 'Special Adjustment',
        title: 'Special Adjustment',
        isTransactional: false,
        appliesToStatusId: null,
        allowsFreeAmount: true,
      }).success,
    ).toBe(true)
  })
})

// README §4.1 and spec fees "Crear un fee", "Formato de los datos de un fee".
describe('FeeCreate', () => {
  const body = { feeTypeId: 3, percentage: '0.025', fixedAmount: '25', startDate: null, endDate: null }

  it('takes the README example, with money and percentages as decimal strings', () => {
    expect(FeeCreate.safeParse({ ...body, description: 'Chargeback fee (applies to every event)' }).success).toBe(true)
  })

  it('defaults an omitted validity to always', () => {
    expect(FeeCreate.parse({ feeTypeId: 3, fixedAmount: '25.0000' })).toMatchObject({ startDate: null, endDate: null })
  })

  it('takes the conditional and brand variants', () => {
    const parsed = FeeCreate.parse({
      ...body,
      conditionalPercentage: '0.02',
      conditionThresholdAmt: '0.0100',
      brandFixedAmount: '1.5',
      brandPercentage: '0.01',
    })
    expect(parsed.brandPercentage).toBe('0.01')
  })

  it('leaves the amount-or-percentage rule to the domain (details.field, D9)', () => {
    expect(FeeCreate.safeParse({ feeTypeId: 3 }).success).toBe(true)
  })

  it('rejects money as a JSON number', () => {
    expect(FeeCreate.safeParse({ ...body, fixedAmount: 15 }).success).toBe(false)
  })

  it('rejects a percentage with seven decimals or above 1', () => {
    expect(FeeCreate.safeParse({ ...body, percentage: '0.0250001' }).success).toBe(false)
    expect(FeeCreate.safeParse({ ...body, percentage: '1.5' }).success).toBe(false)
  })

  it('rejects a date that is not YYYY-MM-DD', () => {
    expect(FeeCreate.safeParse({ ...body, startDate: '2026-11-01T00:00:00Z' }).success).toBe(false)
    expect(FeeCreate.safeParse({ ...body, endDate: '2026-02-30' }).success).toBe(false)
  })

  it('rejects an unknown key and a description over 100 characters', () => {
    expect(FeeCreate.safeParse({ ...body, accountId: '0b6f4c1e-1a2b-4c3d-8e4f-000000000005' }).success).toBe(false)
    expect(FeeCreate.safeParse({ ...body, description: 'x'.repeat(101) }).success).toBe(false)
  })
})

// Spec fees "Corregir un fee en el sitio", "Cambiar un fee desde una fecha", "Límites del cambio desde una fecha".
describe('FeePatch', () => {
  it('takes an in-place correction', () => {
    expect(FeePatch.safeParse({ percentage: '0.0275', reason: 'typo' }).success).toBe(true)
    expect(FeePatch.safeParse({ endDate: '2026-10-31' }).success).toBe(true)
    expect(FeePatch.safeParse({ description: null }).success).toBe(true)
  })

  it('takes a change from a date with at least one new value', () => {
    expect(FeePatch.safeParse({ effectiveFrom: '2026-11-01', percentage: '0.095' }).success).toBe(true)
    expect(FeePatch.safeParse({ effectiveFrom: '2026-11-01', description: 'Renegotiated' }).success).toBe(true)
  })

  it('rejects an empty body', () => {
    expect(FeePatch.safeParse({}).success).toBe(false)
    expect(FeePatch.safeParse({ reason: 'nothing else' }).success).toBe(false)
  })

  it('rejects effectiveFrom without new values or with the validity dates', () => {
    expect(FeePatch.safeParse({ effectiveFrom: '2026-11-01' }).success).toBe(false)
    expect(FeePatch.safeParse({ effectiveFrom: '2026-11-01', reason: 'x' }).success).toBe(false)
    expect(FeePatch.safeParse({ effectiveFrom: '2027-01-01', startDate: '2027-01-01', fixedAmount: '1' }).success).toBe(
      false,
    )
    expect(FeePatch.safeParse({ effectiveFrom: '2027-01-01', endDate: '2027-12-31', fixedAmount: '1' }).success).toBe(
      false,
    )
  })

  it('never edits the type or the account', () => {
    expect(FeePatch.safeParse({ feeTypeId: 2 }).success).toBe(false)
    expect(FeePatch.safeParse({ accountId: '0b6f4c1e-1a2b-4c3d-8e4f-000000000005' }).success).toBe(false)
  })

  it('rejects an empty, blank or too long reason', () => {
    expect(FeePatch.safeParse({ description: 'x', reason: '' }).success).toBe(false)
    expect(FeePatch.safeParse({ description: 'x', reason: '   ' }).success).toBe(false)
    expect(FeePatch.safeParse({ description: 'x', reason: 'r'.repeat(501) }).success).toBe(false)
    expect(FeePatch.parse({ description: 'x', reason: `  ${'r'.repeat(500)}  ` }).reason).toHaveLength(500)
  })

  it('rejects money as a JSON number', () => {
    expect(FeePatch.safeParse({ fixedAmount: 50 }).success).toBe(false)
  })
})

describe('FeeUpdateResult', () => {
  it('has a successor only after a change from a date', () => {
    expect(FeeUpdateResult.safeParse({ fee, successor: null }).success).toBe(true)
    expect(FeeUpdateResult.safeParse({ fee, successor: { ...fee, startDate: '2026-11-01' } }).success).toBe(true)
  })
})

// Spec fees "Vista global de fees", "Filtros de la vista global".
describe('FeesQuery', () => {
  it('defaults to the first page of 50', () => {
    expect(FeesQuery.parse({})).toEqual({ page: 1, pageSize: 50 })
  })

  it('reads the filters from the query string', () => {
    expect(
      FeesQuery.parse({
        merchantId: '1',
        providerId: '2',
        accountId: '0b6f4c1e-1a2b-4c3d-8e4f-000000000005',
        kind: 'preset',
        status: 'active',
        q: 'chargeback',
        page: '2',
        pageSize: '5',
      }),
    ).toEqual({
      merchantId: 1,
      providerId: 2,
      accountId: '0b6f4c1e-1a2b-4c3d-8e4f-000000000005',
      kind: 'preset',
      status: 'active',
      q: 'chargeback',
      page: 2,
      pageSize: 5,
    })
  })

  it('bounds the page size to 1..500', () => {
    expect(FeesQuery.safeParse({ pageSize: '0' }).success).toBe(false)
    expect(FeesQuery.safeParse({ pageSize: '501' }).success).toBe(false)
    expect(FeesQuery.safeParse({ pageSize: '500' }).success).toBe(true)
  })

  it('rejects unknown kinds, statuses and keys', () => {
    expect(FeesQuery.safeParse({ kind: 'batch' }).success).toBe(false)
    expect(FeesQuery.safeParse({ status: 'withdrawn' }).success).toBe(false)
    expect(FeesQuery.safeParse({ sort: 'title' }).success).toBe(false)
  })

  it('rejects an empty or too long search', () => {
    expect(FeesQuery.safeParse({ q: '' }).success).toBe(false)
    expect(FeesQuery.safeParse({ q: 'x'.repeat(101) }).success).toBe(false)
  })
})

describe('FeePage', () => {
  it('lists fees with their merchant, provider and account', () => {
    const item = {
      ...fee,
      merchant: { id: 1, name: 'Merchant A' },
      provider: { id: 2, name: 'ProviderB' },
      account: { id: '0b6f4c1e-1a2b-4c3d-8e4f-000000000009', name: 'ProviderB-Main' },
    }
    expect(FeeListItem.safeParse(item).success).toBe(true)
    expect(FeePage.safeParse({ items: [item], page: 1, pageSize: 50, total: 1 }).success).toBe(true)
  })
})

// Spec fees "Historial de un fee por API".
describe('FeeHistory', () => {
  const snapshot = {
    feeTypeId: 1,
    fixedAmount: null,
    percentage: '0.100000',
    conditionalPercentage: null,
    conditionThresholdAmt: null,
    brandFixedAmount: null,
    brandPercentage: null,
    startDate: null,
    endDate: '2026-10-31',
    description: null,
  }
  const entry = {
    feeHistoryId: 12,
    feeId: '0b6f4c1e-1a2b-4c3d-8e4f-000000000005',
    action: 'closed',
    changedAt: '2026-11-03T15:00:00.000Z',
    changedBy: { userId: 1, userName: 'admin' },
    reason: null,
    before: { ...snapshot, endDate: null },
    after: snapshot,
  }

  it('parses a row with the fee before and after, in API form', () => {
    expect(FeeHistoryEntry.safeParse(entry).success).toBe(true)
    expect(FeeHistoryEntry.safeParse({ ...entry, action: 'created', before: null }).success).toBe(true)
  })

  it('rejects numbers in the snapshot and unknown actions', () => {
    expect(FeeHistoryEntry.safeParse({ ...entry, after: { ...snapshot, percentage: 0.1 } }).success).toBe(false)
    expect(FeeHistoryEntry.safeParse({ ...entry, action: 'deleted' }).success).toBe(false)
  })

  it('takes the scope of the fee or of its type', () => {
    expect(FeeHistoryQuery.parse({})).toEqual({ scope: 'fee' })
    expect(FeeHistoryQuery.parse({ scope: 'type' })).toEqual({ scope: 'type' })
    expect(FeeHistoryQuery.safeParse({ scope: 'account' }).success).toBe(false)
  })
})

// design D9: details of the 409 errors.
describe('Fee error details', () => {
  it('lists the conflicts of an overlap', () => {
    expect(
      FeeOverlapDetails.safeParse({
        conflicts: [{ feeId: '0b6f4c1e-1a2b-4c3d-8e4f-000000000005', startDate: null, endDate: null }],
      }).success,
    ).toBe(true)
  })

  it('names the fields or the last applied event of a fee in use', () => {
    expect(FeeInUseDetails.safeParse({ fields: ['percentage'] }).success).toBe(true)
    expect(FeeInUseDetails.safeParse({ lastAppliedEventDate: '2026-10-15' }).success).toBe(true)
  })
})
