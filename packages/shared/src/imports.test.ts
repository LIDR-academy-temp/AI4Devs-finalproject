import { describe, expect, it } from 'vitest'
import { UserRef } from './auth.js'
import { ColumnProposal, ImportDetail, ImportSummary, ImportsQuery, SheetProposal } from './imports.js'

const IMPORT_ID = '0f1c1e2a-3b4c-4d5e-8f60-718293a4b5c6'
const ACCOUNT_ID = '7b1f3c7e-5d2a-4e9b-9c1d-2f3a4b5c6d7e'
const FILE_ID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'
const SHEET_APP = '2b3c4d5e-6f70-4a8b-9c0d-1e2f3a4b5c6d'
const SHEET_FEES = '3c4d5e6f-7081-4b9c-8d1e-2f3a4b5c6d7e'

const summary = {
  importId: IMPORT_ID,
  accountId: ACCOUNT_ID,
  status: 'uploaded',
  createdBy: { userId: 2, userName: 'analyst' },
  createdAt: '2026-10-16T10:00:00.000Z',
  updatedAt: '2026-10-16T10:00:00.000Z',
  analyzedAt: null,
  rowsTotal: null,
  rowsMatched: null,
  rowsUnmatched: null,
  currentBatchId: null,
  fileCount: 1,
}

const templateColumns = [
  { sourceColumn: 'ID', targetField: 'transactionId', source: 'global' },
  { sourceColumn: 'Amount', targetField: 'amount', source: 'global' },
  { sourceColumn: 'Currency', targetField: 'currency', source: 'global' },
]

const detail = {
  ...summary,
  files: [
    {
      fileId: FILE_ID,
      fileName: 'Recon_Template_ProviderA-USD_batch-clean.xlsx',
      sizeBytes: 31510,
      sha256: 'c46857d3b6580aba6daf6b63b66e67583b399cd356a71bd16e659bc252128352',
      uploadedAt: '2026-10-16T10:00:00.000Z',
      sheets: [
        {
          sheetId: SHEET_APP,
          sheetName: 'APP',
          hidden: false,
          rowCount: 340,
          proposed: { kind: 'transactions', cycle: 'E', statusId: 2, statusName: 'Successful', source: 'global' },
          columns: templateColumns,
          preview: [{ ID: '252570479111759', Amount: '16.22', Currency: 'USD' }],
        },
        {
          sheetId: SHEET_FEES,
          sheetName: 'Other Fees',
          hidden: false,
          rowCount: 2,
          proposed: { kind: 'batch_fees', cycle: null, statusId: null, statusName: null, source: 'global' },
          columns: [
            { sourceColumn: 'Type of Fee', targetField: 'feeType', source: 'global' },
            { sourceColumn: 'Amount', targetField: 'amount', source: 'global' },
            { sourceColumn: 'Currency', targetField: 'currency', source: 'global' },
          ],
          preview: [{ 'Type of Fee': 'Wire Fee', Amount: '25', Currency: 'USD' }],
        },
      ],
    },
  ],
  readiness: {
    canAnalyze: true,
    missing: [],
    notes: [{ sheetId: SHEET_FEES, sheetName: 'Other Fees', message: 'Batch fees sheet' }],
  },
}

describe('ImportDetail', () => {
  it('accepts the detail of the batch-clean upload', () => {
    expect(ImportDetail.safeParse(detail).success).toBe(true)
  })

  it('rejects a preview cell that is a JSON number: every cell travels as text', () => {
    const sheets = detail.files[0]?.sheets ?? []
    const broken = {
      ...detail,
      files: [{ ...detail.files[0], sheets: [{ ...sheets[0], preview: [{ ID: 252570479111759, Amount: '16.22' }] }] }],
    }

    expect(ImportDetail.safeParse(broken).success).toBe(false)
  })

  it('rejects a negative rowCount, an unknown source and an unknown status', () => {
    const sheet = detail.files[0]?.sheets[0]
    const withSheet = (overrides: object) => ({
      ...detail,
      files: [{ ...detail.files[0], sheets: [{ ...sheet, ...overrides }] }],
    })

    expect(ImportDetail.safeParse(withSheet({ rowCount: -1 })).success).toBe(false)
    expect(ImportDetail.safeParse(withSheet({ proposed: { ...sheet?.proposed, source: 'rule' } })).success).toBe(false)
    expect(ImportDetail.safeParse({ ...detail, status: 'nope' }).success).toBe(false)
  })
})

describe('SheetProposal and ColumnProposal', () => {
  it('accept a sheet without proposal (kind null, source none)', () => {
    const parsed = SheetProposal.safeParse({
      kind: null,
      cycle: null,
      statusId: null,
      statusName: null,
      source: 'none',
    })

    expect(parsed.success).toBe(true)
  })

  it('accept a column without proposal and a status column with its resolved values', () => {
    expect(ColumnProposal.safeParse({ sourceColumn: 'Importe', targetField: null, source: 'none' }).success).toBe(true)
    const status = ColumnProposal.safeParse({
      sourceColumn: 'Order Status',
      targetField: 'status',
      source: 'account',
      statusValues: [{ value: 'CHB 2', statusId: 4, statusName: 'Chargeback', excludeAmount: true }],
    })
    expect(status.success).toBe(true)
  })

  it('rejects a target field outside the vocabulary', () => {
    expect(ColumnProposal.safeParse({ sourceColumn: 'ID', targetField: 'txnId', source: 'global' }).success).toBe(false)
  })
})

describe('ImportSummary', () => {
  it('requires createdBy with userId and userName, and fileCount', () => {
    expect(ImportSummary.safeParse(summary).success).toBe(true)
    expect(ImportSummary.safeParse({ ...summary, createdBy: { userId: 2 } }).success).toBe(false)
    expect(ImportSummary.safeParse({ ...summary, fileCount: undefined }).success).toBe(false)
  })
})

describe('ImportsQuery', () => {
  it('accepts no filter and a known status, rejects an unknown one', () => {
    expect(ImportsQuery.safeParse({}).success).toBe(true)
    expect(ImportsQuery.safeParse({ status: 'uploaded' }).success).toBe(true)
    expect(ImportsQuery.safeParse({ status: 'nope' }).success).toBe(false)
  })
})

describe('UserRef', () => {
  it('is the pair userId and userName', () => {
    expect(UserRef.safeParse({ userId: 7, userName: 'analyst1' }).success).toBe(true)
    expect(UserRef.safeParse({ userId: '7', userName: 'analyst1' }).success).toBe(false)
  })
})
