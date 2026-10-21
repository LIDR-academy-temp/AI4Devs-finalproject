import { describe, expect, it } from 'vitest'
import {
  AccountSettlement,
  AccountSettlementsPage,
  AccountSettlementsQuery,
  AppliedFee,
  ExportQuery,
  ExportType,
  ImportSettlementAttempt,
  ImportSettlements,
  SettlementMovement,
  SettlementTransactionsPage,
  SettlementTransactionsQuery,
} from './settlement-reads.js'

// Contract for #13 (summary-exports design, "Contrato para #13"): money as decimal strings and BIGINT ids as strings.
const BATCH_ID = '5c3f9e21-8a4b-4f0e-b1d2-6e7f8a9b0c1d'
const IMPORT_ID = '7b0c2a52-3f8e-4d0a-9a61-0d8f3b1e2c44'
const SHEET_ID = '2d4e6f80-1a2b-4c3d-8e9f-0a1b2c3d4e5f'
const FEE_ID = '0b8e1c2d-3e4f-4a5b-9c6d-7e8f9a0b1c2d'

const fee = {
  appliedFeeId: '120334',
  feeId: FEE_ID,
  feeTypeId: 4,
  code: 'Chargeback',
  title: 'Chargeback',
  eventDate: '2026-10-03T14:12:00.000Z',
  amountUsd: '45.0000',
  configurationSnapshot: { fixedAmount: '45.0000', percentage: null, base: '96.9300' },
}

const movement = {
  settlementTxnId: '88213',
  transactionId: '40711',
  sourceTransactionId: '911545598812004',
  gatewayId: 1,
  cycle: 'I',
  status: 'Chargeback',
  roundNo: 2,
  sheetId: SHEET_ID,
  sheetName: 'CHB',
  rowNo: 2,
  amount: '96.9300',
  excludeAmount: false,
  feeAmount: '45.0000',
  eventDate: '2026-10-03T14:12:00.000Z',
  appliedReservePct: '0.100000',
  reserveDaysUsed: 180,
  expectedReserveReleaseAt: null,
  reserveHeldAmt: '0.0000',
  reserveReleasedAmt: '0.0000',
  reserveEarlyReleasedAmt: '0.0000',
  reservePolicySnapshot: { policy: 'hold_until_term', applied: false },
  settled: false,
  fees: [fee],
}

const attempt = {
  batchId: BATCH_ID,
  batchNo: 123,
  attemptNo: 1,
  status: 'processed',
  settledStatus: 'pending_payment',
  processedAt: '2026-10-19T15:40:03.120Z',
  approvedBy: { userId: 2, userName: 'analyst' },
  amountPayable: '33771.3600',
  isCurrent: true,
}

describe('SettlementTransactionsQuery', () => {
  it('requires type and defaults page 1 and pageSize 50', () => {
    expect(SettlementTransactionsQuery.parse({ type: 'E' })).toEqual({ type: 'E', page: 1, pageSize: 50 })
    expect(SettlementTransactionsQuery.safeParse({}).success).toBe(false)
  })

  it('accepts only the three cycles', () => {
    for (const type of ['E', 'I', 'R']) expect(SettlementTransactionsQuery.safeParse({ type }).success).toBe(true)
    for (const type of ['X', 'e', 'APP', ''])
      expect(SettlementTransactionsQuery.safeParse({ type }).success).toBe(false)
  })

  it('coerces query strings and bounds page and pageSize', () => {
    expect(SettlementTransactionsQuery.parse({ type: 'R', page: '7', pageSize: '70' })).toEqual({
      type: 'R',
      page: 7,
      pageSize: 70,
    })
    expect(SettlementTransactionsQuery.parse({ type: 'I', pageSize: '500' }).pageSize).toBe(500)
    for (const bad of [{ page: '0' }, { pageSize: '0' }, { pageSize: '501' }, { page: '1.5' }])
      expect(SettlementTransactionsQuery.safeParse({ type: 'E', ...bad }).success).toBe(false)
  })
})

describe('AppliedFee', () => {
  it('accepts the contract example', () => {
    expect(AppliedFee.parse(fee)).toEqual(fee)
  })

  it('carries the BIGINT id as a string, never a number', () => {
    expect(AppliedFee.safeParse({ ...fee, appliedFeeId: 120334 }).success).toBe(false)
  })

  it('carries money as a string with four decimals', () => {
    expect(AppliedFee.safeParse({ ...fee, amountUsd: 45 }).success).toBe(false)
    expect(AppliedFee.safeParse({ ...fee, amountUsd: '45.00' }).success).toBe(false)
  })

  it('admits a null event date, fee id and snapshot', () => {
    expect(AppliedFee.safeParse({ ...fee, eventDate: null, feeId: null, configurationSnapshot: null }).success).toBe(
      true,
    )
  })
})

describe('SettlementMovement', () => {
  it('accepts the contract example', () => {
    expect(SettlementMovement.parse(movement)).toEqual(movement)
  })

  it('carries BIGINT ids as strings, never numbers', () => {
    expect(SettlementMovement.safeParse({ ...movement, settlementTxnId: 88213 }).success).toBe(false)
    expect(SettlementMovement.safeParse({ ...movement, transactionId: 40711 }).success).toBe(false)
  })

  it('keeps the external id as text, numeric or UUID', () => {
    const uuid = '4f0c2d1e-9a7b-4c3d-8e6f-1a2b3c4d5e6f'
    expect(SettlementMovement.parse({ ...movement, sourceTransactionId: uuid }).sourceTransactionId).toBe(uuid)
    expect(SettlementMovement.safeParse({ ...movement, sourceTransactionId: 911545598812004 }).success).toBe(false)
  })

  it('carries money with four decimals and the reserve rate with six', () => {
    expect(SettlementMovement.safeParse({ ...movement, amount: 96.93 }).success).toBe(false)
    expect(SettlementMovement.safeParse({ ...movement, reserveHeldAmt: '0' }).success).toBe(false)
    expect(SettlementMovement.safeParse({ ...movement, appliedReservePct: '0.1' }).success).toBe(false)
  })

  it('admits a seeded movement without sheet or row, and an undated adjustment', () => {
    const seeded = { ...movement, sheetId: null, sheetName: null, rowNo: null, eventDate: null, roundNo: null }
    expect(SettlementMovement.safeParse(seeded).success).toBe(true)
  })

  it('takes the status from the catalog, never Pending', () => {
    for (const status of ['Successful', 'Declined', 'Chargeback', 'Refund', 'RDR'])
      expect(SettlementMovement.safeParse({ ...movement, status }).success).toBe(true)
    for (const status of ['Pending', 'CHB 2', 'SUC'])
      expect(SettlementMovement.safeParse({ ...movement, status }).success).toBe(false)
  })

  it('accepts only rounds 1 and 2', () => {
    expect(SettlementMovement.safeParse({ ...movement, roundNo: 3 }).success).toBe(false)
  })
})

describe('SettlementTransactionsPage', () => {
  it('accepts the contract example', () => {
    const page = { batchId: BATCH_ID, type: 'I', page: 1, pageSize: 50, total: 10, items: [movement] }
    expect(SettlementTransactionsPage.parse(page)).toEqual(page)
  })

  it('requires the batch, the cycle and the totals', () => {
    const page = { batchId: BATCH_ID, type: 'I', page: 1, pageSize: 50, total: 10, items: [] }
    for (const key of ['batchId', 'type', 'page', 'pageSize', 'total', 'items']) {
      const { [key]: _omitted, ...rest } = page as Record<string, unknown>
      expect(SettlementTransactionsPage.safeParse(rest).success).toBe(false)
    }
  })
})

describe('ImportSettlements', () => {
  it('accepts the contract example', () => {
    const body = { importId: IMPORT_ID, currentBatchId: BATCH_ID, items: [attempt] }
    expect(ImportSettlements.parse(body)).toEqual(body)
  })

  it('admits an import without attempts', () => {
    expect(ImportSettlements.safeParse({ importId: IMPORT_ID, currentBatchId: null, items: [] }).success).toBe(true)
  })

  it('derives the payment from the attempt status vocabulary', () => {
    for (const settledStatus of ['pending_payment', 'settled', 'undone'])
      expect(ImportSettlementAttempt.safeParse({ ...attempt, settledStatus }).success).toBe(true)
    expect(ImportSettlementAttempt.safeParse({ ...attempt, settledStatus: 'paid' }).success).toBe(false)
    expect(ImportSettlementAttempt.safeParse({ ...attempt, status: 'settled' }).success).toBe(false)
  })

  it('requires isCurrent and carries the amount payable as a string', () => {
    const { isCurrent: _omitted, ...withoutCurrent } = attempt
    expect(ImportSettlementAttempt.safeParse(withoutCurrent).success).toBe(false)
    expect(ImportSettlementAttempt.safeParse({ ...attempt, amountPayable: 33771.36 }).success).toBe(false)
  })
})

const ACCOUNT_ID = '9a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'

const accountSettlement = {
  batchId: BATCH_ID,
  importId: IMPORT_ID,
  batchNo: 123,
  attemptNo: 1,
  status: 'processed',
  settledStatus: 'pending_payment',
  settlementDate: '2026-10-24',
  processedAt: '2026-10-20T15:40:03.120Z',
  approvedBy: { userId: 2, userName: 'analyst' },
  amountPayable: '33771.3600',
  channels: 'RAM-01,RAM-02,RAM-07',
}

describe('AccountSettlementsQuery', () => {
  it('defaults page 1, pageSize 50 and the settlement date', () => {
    expect(AccountSettlementsQuery.parse({})).toEqual({ dateField: 'settlementDate', page: 1, pageSize: 50 })
  })

  it('coerces query strings and bounds page and pageSize', () => {
    expect(AccountSettlementsQuery.parse({ page: '2', pageSize: '20' })).toMatchObject({ page: 2, pageSize: 20 })
    for (const bad of [{ page: '0' }, { pageSize: '0' }, { pageSize: '501' }, { page: '1.5' }])
      expect(AccountSettlementsQuery.safeParse(bad).success).toBe(false)
  })

  it('accepts only the three attempt statuses', () => {
    for (const status of ['processed', 'paid', 'undone'])
      expect(AccountSettlementsQuery.parse({ status }).status).toBe(status)
    for (const status of ['settled', 'Paid', ''])
      expect(AccountSettlementsQuery.safeParse({ status }).success).toBe(false)
  })

  it('filters on the settlement date or the processed day', () => {
    for (const dateField of ['settlementDate', 'processedAt'])
      expect(AccountSettlementsQuery.parse({ dateField }).dateField).toBe(dateField)
    for (const dateField of ['createdAt', 'processedat', ''])
      expect(AccountSettlementsQuery.safeParse({ dateField }).success).toBe(false)
  })

  it('takes calendar days as YYYY-MM-DD', () => {
    expect(AccountSettlementsQuery.parse({ from: '2026-10-24', to: '2026-10-24' })).toMatchObject({
      from: '2026-10-24',
      to: '2026-10-24',
    })
    for (const from of ['24/10/2026', '2026-02-30', '2026-10-24T00:00:00Z'])
      expect(AccountSettlementsQuery.safeParse({ from }).success).toBe(false)
  })

  it('rejects a range whose start is after its end', () => {
    const parsed = AccountSettlementsQuery.safeParse({ from: '2026-10-24', to: '2026-10-01' })
    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.path).toEqual(['from'])
    expect(AccountSettlementsQuery.safeParse({ from: '2026-10-01', to: '2026-10-24' }).success).toBe(true)
  })

  it('rejects an unknown parameter', () => {
    expect(AccountSettlementsQuery.safeParse({ cycle: 'E' }).success).toBe(false)
  })
})

describe('AccountSettlementsPage', () => {
  it('accepts the contract example', () => {
    const page = { accountId: ACCOUNT_ID, page: 1, pageSize: 2, total: 23, items: [accountSettlement] }
    expect(AccountSettlementsPage.parse(page)).toEqual(page)
  })

  it('admits an attempt without settlement date or channels', () => {
    const bare = { ...accountSettlement, settlementDate: null, channels: null }
    expect(AccountSettlement.parse(bare)).toEqual(bare)
  })

  it('carries the amount payable as a string and the audit instant in UTC', () => {
    expect(AccountSettlement.safeParse({ ...accountSettlement, amountPayable: 33771.36 }).success).toBe(false)
    expect(AccountSettlement.safeParse({ ...accountSettlement, processedAt: '2026-10-20T15:40:03.120' }).success).toBe(
      false,
    )
    expect(AccountSettlement.safeParse({ ...accountSettlement, status: 'settled' }).success).toBe(false)
  })

  it('requires the account and the totals', () => {
    const page = { accountId: ACCOUNT_ID, page: 1, pageSize: 50, total: 0, items: [] }
    for (const key of ['accountId', 'page', 'pageSize', 'total', 'items']) {
      const { [key]: _omitted, ...rest } = page as Record<string, unknown>
      expect(AccountSettlementsPage.safeParse(rest).success).toBe(false)
    }
  })
})

describe('ExportQuery', () => {
  it('requires one of the three export types', () => {
    expect(ExportType.options).toEqual(['summary', 'transactions', 'reserves'])
    for (const type of ExportType.options) expect(ExportQuery.parse({ type })).toEqual({ type })
    expect(ExportQuery.safeParse({}).success).toBe(false)
    expect(ExportQuery.safeParse({ type: 'pdf' }).success).toBe(false)
  })
})
