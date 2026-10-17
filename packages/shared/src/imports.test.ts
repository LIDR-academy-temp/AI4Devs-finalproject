import { describe, expect, it } from 'vitest'
import { UserRef } from './auth.js'
import {
  AnalysisSummary,
  BatchFeeProposal,
  ChannelNotice,
  ColumnProposal,
  ImportDetail,
  ImportRowItem,
  ImportRowsPage,
  ImportRowsQuery,
  ImportSummary,
  ImportsQuery,
  MappingConfirmation,
  ReadinessItem,
  ResolveRowBody,
  SheetProposal,
} from './imports.js'

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
          mappingConfirmed: false,
          mapping: null,
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
          mappingConfirmed: false,
          mapping: null,
        },
      ],
    },
  ],
  readiness: {
    canAnalyze: true,
    missing: [],
    notes: [{ sheetId: SHEET_FEES, sheetName: 'Other Fees', message: 'Batch fees sheet' }],
  },
  analysis: null,
  channels: null,
  batchFees: null,
}

const warnings = {
  negative_amount: 0,
  non_usd_currency: 0,
  amount_unparsed: 0,
  currency_invalid: 0,
  id_length: 0,
  lossy_numeric_id: 0,
  status_unresolved: 0,
  status_differs_from_sheet: 0,
  cycle_mismatch: 0,
}

/** The spec's "Forma de una fila": the unmatched row of batch-issues. */
const rowItem = {
  fileId: FILE_ID,
  fileName: 'Recon_Template_ProviderB-Main_batch-issues.xlsx',
  sheetId: SHEET_APP,
  sheetName: 'APP',
  rowNo: 341,
  cycle: 'E',
  matchResult: 'unmatched',
  reason: 'no_match',
  transactionIdRaw: '4260465812403708',
  transactionId: null,
  gatewayId: null,
  statusRaw: null,
  statusId: 2,
  statusName: 'Successful',
  amount: '120.0000',
  currency: 'USD',
  excludeAmount: false,
  ignore: false,
  warnings: [],
  candidates: [],
  transaction: null,
  rawData: { ID: '4260465812403708', Amount: '120', Currency: 'USD' },
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

// ───────────────────────── import-analyze (spec "Detalle de un import", "Filas del import"…) ─────────────────────────

describe('ImportDetail after the analysis', () => {
  const sheets = detail.files[0]?.sheets ?? []
  const confirmedSheet = {
    ...sheets[0],
    mappingConfirmed: true,
    mapping: {
      kind: 'transactions',
      cycle: 'E',
      statusId: 2,
      statusName: 'Successful',
      columns: [
        { sourceColumn: 'ID', targetField: 'transactionId' },
        { sourceColumn: 'Amount', targetField: 'amount' },
      ],
    },
  }
  const analyzed = {
    ...detail,
    status: 'analyzed',
    analyzedAt: '2026-10-16T10:05:00.000Z',
    rowsTotal: 783,
    rowsMatched: 780,
    rowsUnmatched: 0,
    files: [{ ...detail.files[0], sheets: [confirmedSheet] }],
    analysis: {
      rows: { total: 783, matched: 780, unmatched: 0, ambiguous: 0, ignored: 3 },
      byCycle: { E: 450, I: 10, R: 320 },
      warnings,
    },
    channels: [
      {
        channelId: 1007,
        name: 'RAM-07',
        gatewayId: 1,
        providerId: 101,
        rowCount: 12,
        assignment: 'unassigned',
        otherAccount: null,
        note: 'Will be associated to this account as primary when the batch is processed',
      },
      {
        channelId: 1001,
        name: 'RAM-01',
        gatewayId: 1,
        providerId: 101,
        rowCount: 1,
        assignment: 'assigned_to_other_account',
        otherAccount: { accountId: ACCOUNT_ID, name: 'ProviderA-USD' },
        note: null,
      },
    ],
    batchFees: [
      { feeTypeId: 119, code: 'WIRE', title: 'Wire Fee', amount: '25.0000', currency: 'USD', source: 'file' },
      {
        feeTypeId: null,
        code: null,
        title: 'Fraud Monitoring Fee',
        amount: '99.0000',
        currency: 'USD',
        source: 'file',
        warning: 'Fee type not in catalog; kept as free amount',
      },
    ],
  }

  it('accepts analysis, channels and batchFees populated, and the confirmed mapping per sheet', () => {
    const parsed = ImportDetail.safeParse(analyzed)
    expect(parsed.error?.issues).toBeUndefined()
    expect(parsed.success).toBe(true)
  })

  it('requires mappingConfirmed and a nullable mapping on every sheet', () => {
    const { mappingConfirmed: _confirmed, mapping: _mapping, ...bare } = confirmedSheet
    expect(ImportDetail.safeParse({ ...analyzed, files: [{ ...detail.files[0], sheets: [bare] }] }).success).toBe(false)
  })

  it('requires every warning code in analysis.warnings (zeros are explicit)', () => {
    const { cycle_mismatch: _dropped, ...partial } = warnings
    const broken = { ...analyzed, analysis: { ...analyzed.analysis, warnings: partial } }
    expect(ImportDetail.safeParse(broken).success).toBe(false)
  })

  it('rejects an unknown channel assignment and a batch fee amount that is a number', () => {
    const channel = analyzed.channels[0]
    expect(ImportDetail.safeParse({ ...analyzed, channels: [{ ...channel, assignment: 'maybe' }] }).success).toBe(false)
    const fee = analyzed.batchFees[0]
    expect(ImportDetail.safeParse({ ...analyzed, batchFees: [{ ...fee, amount: 25 }] }).success).toBe(false)
  })

  it('AnalysisSummary, ChannelNotice and BatchFeeProposal parse on their own', () => {
    expect(AnalysisSummary.safeParse(analyzed.analysis).success).toBe(true)
    expect(ChannelNotice.safeParse(analyzed.channels[1]).success).toBe(true)
    expect(BatchFeeProposal.safeParse(analyzed.batchFees[1]).success).toBe(true)
  })
})

describe('MappingConfirmation', () => {
  const body = {
    sheets: [
      {
        sheetId: SHEET_APP,
        kind: 'transactions',
        cycle: 'E',
        statusId: 2,
        columns: [
          { sourceColumn: 'ID', targetField: 'transactionId' },
          { sourceColumn: 'Amount', targetField: 'amount' },
          { sourceColumn: 'Currency', targetField: 'currency' },
        ],
      },
      { sheetId: SHEET_FEES, kind: 'batch_fees', cycle: null, statusId: null, columns: [] },
    ],
  }

  it('accepts the confirmation of the template proposal', () => {
    expect(MappingConfirmation.safeParse(body).success).toBe(true)
  })

  it('rejects an unknown kind, cycle or target field, and an empty sheet list', () => {
    const sheet = body.sheets[0]
    const withSheet = (overrides: object) => ({ sheets: [{ ...sheet, ...overrides }] })

    expect(MappingConfirmation.safeParse(withSheet({ kind: 'x' })).success).toBe(false)
    expect(MappingConfirmation.safeParse(withSheet({ cycle: 'X' })).success).toBe(false)
    expect(
      MappingConfirmation.safeParse(withSheet({ columns: [{ sourceColumn: 'ID', targetField: 'txnId' }] })).success,
    ).toBe(false)
    expect(MappingConfirmation.safeParse({ sheets: [] }).success).toBe(false)
  })
})

describe('ReadinessItem', () => {
  it('accepts an optional field from the closed list and rejects any other', () => {
    const item = { sheetId: SHEET_APP, sheetName: 'APP', message: 'No column is proposed as transactionId' }
    expect(ReadinessItem.safeParse(item).success).toBe(true)
    expect(ReadinessItem.safeParse({ ...item, field: 'transactionId' }).success).toBe(true)
    expect(ReadinessItem.safeParse({ ...item, field: 'confirmation' }).success).toBe(true)
    expect(ReadinessItem.safeParse({ ...item, field: 'foo' }).success).toBe(false)
  })
})

describe('ImportRowItem and ImportRowsPage', () => {
  it('accepts the unmatched row of batch-issues with transactionId as string or null', () => {
    expect(ImportRowItem.safeParse(rowItem).success).toBe(true)
    const matched = {
      ...rowItem,
      matchResult: 'matched',
      reason: null,
      transactionId: '98765',
      gatewayId: 1,
      transaction: {
        transactionId: '98765',
        channelId: 1001,
        channelName: 'RAM-01',
        statusId: 2,
        statusName: 'Successful',
        amount: '120.0000',
        transactionDate: '2026-10-01T12:00:00.000Z',
      },
    }
    expect(ImportRowItem.safeParse(matched).success).toBe(true)
  })

  it('rejects a numeric transactionId, a numeric amount, an unknown reason and an unknown warning', () => {
    expect(ImportRowItem.safeParse({ ...rowItem, transactionId: 98765 }).success).toBe(false)
    expect(ImportRowItem.safeParse({ ...rowItem, amount: 120 }).success).toBe(false)
    expect(ImportRowItem.safeParse({ ...rowItem, reason: 'because' }).success).toBe(false)
    expect(ImportRowItem.safeParse({ ...rowItem, warnings: ['odd'] }).success).toBe(false)
  })

  it('accepts an ambiguous row with its candidates', () => {
    const ambiguous = {
      ...rowItem,
      matchResult: 'ambiguous',
      reason: null,
      candidates: [
        {
          gatewayId: 1,
          gatewayName: 'Gateway Numeric',
          transactionId: '1',
          channelId: 1001,
          channelName: 'RAM-01',
          statusId: 2,
          statusName: 'Successful',
          amount: '16.2200',
        },
        {
          gatewayId: 9001,
          gatewayName: 'Gateway Test',
          transactionId: '2',
          channelId: 9001,
          channelName: 'RAM-T1',
          statusId: 2,
          statusName: 'Successful',
          amount: '16.2200',
        },
      ],
    }
    expect(ImportRowItem.safeParse(ambiguous).success).toBe(true)
  })

  it('ImportRowsPage carries items, page, pageSize and total', () => {
    expect(ImportRowsPage.safeParse({ items: [rowItem], page: 1, pageSize: 50, total: 772 }).success).toBe(true)
    expect(ImportRowsPage.safeParse({ items: [rowItem], page: 1, pageSize: 50 }).success).toBe(false)
  })
})

describe('ImportRowsQuery', () => {
  it('defaults to page 1 and pageSize 50 and coerces query strings', () => {
    expect(ImportRowsQuery.parse({})).toEqual({ page: 1, pageSize: 50 })
    expect(ImportRowsQuery.parse({ page: '3', pageSize: '100', match: 'ignored' })).toEqual({
      page: 3,
      pageSize: 100,
      match: 'ignored',
    })
    expect(ImportRowsQuery.parse({ sheetId: SHEET_APP })).toMatchObject({ sheetId: SHEET_APP })
  })

  it.each([{ page: '0' }, { pageSize: '0' }, { pageSize: '501' }, { match: 'weird' }, { sheetId: 'abc' }])(
    'rejects %o',
    (query) => {
      expect(ImportRowsQuery.safeParse(query).success).toBe(false)
    },
  )
})

describe('ResolveRowBody', () => {
  it('requires a positive integer gatewayId', () => {
    expect(ResolveRowBody.safeParse({ gatewayId: 3 }).success).toBe(true)
    expect(ResolveRowBody.safeParse({ gatewayId: 0 }).success).toBe(false)
    expect(ResolveRowBody.safeParse({ gatewayId: '3' }).success).toBe(false)
    expect(ResolveRowBody.safeParse({}).success).toBe(false)
  })
})
