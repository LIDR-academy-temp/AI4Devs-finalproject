import type { SettlementView } from '@recon/shared'
import { describe, expect, it } from 'vitest'
import { NotFoundError } from '../../../shared/errors.js'
import { InMemoryAuditLogger } from '../../../test-support/in-memory-audit-logger.js'
import { EXAMPLE_BATCH_ID, exampleView } from '../test-support/example-view.js'
import { exportRow } from '../test-support/export-rows.js'
import {
  BATCH_HEADER,
  type InMemoryQueriesData,
  InMemorySettlementQueries,
  RecordingSettlementReader,
  storedMovement,
} from './__fakes__/in-memory-reads.js'
import { SettlementReadService } from './settlement-read-service.js'

// Spec settlement "Lectura del intento", "Movimientos del intento", "Intentos de un import", "Exports" and "Alcance y
// permisos" over in-memory doubles (summary-exports design D2, D3, D10): scope before the view, the scope passed to the
// reader, the identical 404, Settled from the attempt and one audit entry per download, written after generating.
const MERCHANT_1 = { merchantIds: [1] }
const ANALYST_ID = 2
const IMPORT_ID = '7b0c2a52-3f8e-4d0a-9a61-0d8f3b1e2c44'
const OTHER_BATCH = '9d1e2f30-4a5b-4c6d-8e7f-901a2b3c4d5e'
const UNDATED = {
  code: 'undated_adjustment' as const,
  transactionId: '40711',
  sheetId: '2d4e6f80-1a2b-4c3d-8e9f-0a1b2c3d4e5f',
  rowNo: 7,
  feeSkipped: true,
}

function setup(data: InMemoryQueriesData = {}, views = new Map([[EXAMPLE_BATCH_ID, exampleView()]])) {
  const queries = new InMemorySettlementQueries({
    headers: [BATCH_HEADER, { ...BATCH_HEADER, batchId: OTHER_BATCH, status: 'paid' }],
    merchantOf: new Map([[OTHER_BATCH, 2]]),
    ...data,
  })
  const reader = new RecordingSettlementReader(views)
  const audit = new InMemoryAuditLogger()
  return { queries, reader, audit, service: new SettlementReadService({ queries, reader, audit }) }
}

describe('view', () => {
  it('answers the view of the reader, passing it the scope of the request', async () => {
    const { service, reader } = setup()
    expect(await service.view(MERCHANT_1, EXAMPLE_BATCH_ID)).toEqual(exampleView())
    expect(reader.scopes).toEqual([MERCHANT_1])
  })

  it('answers 404 Settlement for an unknown batch and for one outside the scope, without reading the view', async () => {
    const { service, reader } = setup()
    for (const batchId of ['00000000-0000-4000-8000-00000000ffff', OTHER_BATCH]) {
      const error = await service.view(MERCHANT_1, batchId).catch((e: unknown) => e)
      expect(error).toBeInstanceOf(NotFoundError)
      expect((error as Error).message).toBe('Settlement not found')
    }
    expect(reader.scopes).toEqual([])
  })
})

describe('transactions', () => {
  const query = { type: 'I' as const, page: 1, pageSize: 50 }

  it('answers the page of the cycle with the batch, the type and settled = false for a processed attempt', async () => {
    const { service } = setup({ movements: [storedMovement(), storedMovement({ cycle: 'E', status: 'Successful' })] })
    expect(await service.transactions(MERCHANT_1, EXAMPLE_BATCH_ID, query)).toEqual({
      batchId: EXAMPLE_BATCH_ID,
      type: 'I',
      page: 1,
      pageSize: 50,
      total: 1,
      items: [{ ...storedMovement(), settled: false }],
    })
  })

  it('derives settled from a paid attempt, never from the movement', async () => {
    const { service } = setup({ movements: [storedMovement()] })
    const page = await service.transactions({ merchantIds: [1, 2] }, OTHER_BATCH, query)
    expect(page.items.map((m) => m.settled)).toEqual([true])
  })

  it('answers 404 Settlement outside the scope', async () => {
    const { service } = setup()
    await expect(service.transactions(MERCHANT_1, OTHER_BATCH, query)).rejects.toThrow('Settlement not found')
  })
})

describe('importSettlements', () => {
  const attempts = {
    importId: IMPORT_ID,
    currentBatchId: EXAMPLE_BATCH_ID,
    items: [
      {
        batchId: EXAMPLE_BATCH_ID,
        batchNo: 123,
        attemptNo: 1,
        status: 'processed' as const,
        settledStatus: 'pending_payment' as const,
        processedAt: '2026-10-19T15:40:03.120Z',
        approvedBy: { userId: 2, userName: 'analyst' },
        amountPayable: '33771.3600',
        isCurrent: true,
      },
    ],
  }

  it('answers the attempts of the import', async () => {
    const { service } = setup({ attempts: [attempts] })
    expect(await service.importSettlements(MERCHANT_1, IMPORT_ID)).toEqual(attempts)
  })

  it('answers 404 Import for an unknown import and for one outside the scope', async () => {
    const { service } = setup({ attempts: [attempts], merchantOf: new Map([[IMPORT_ID, 2]]) })
    await expect(service.importSettlements(MERCHANT_1, IMPORT_ID)).rejects.toThrow('Import not found')
    await expect(service.importSettlements(MERCHANT_1, OTHER_BATCH)).rejects.toThrow(NotFoundError)
  })
})

describe('export', () => {
  const rows = [
    exportRow('911545593909470', 'E', 'Successful'),
    exportRow('911545598812004', 'I', 'Chargeback'),
    exportRow('911545512345678', 'R', 'Successful'),
  ]

  it('generates the TXN from the E and I rows, audits the download and answers the file', async () => {
    const { service, queries, audit } = setup({ exportRows: rows })
    const file = await service.export(MERCHANT_1, ANALYST_ID, EXAMPLE_BATCH_ID, 'transactions')
    expect(file).toEqual({
      fileName: 'ProviderA-USD_B123_A1_transactions.csv',
      body: 'ID,Status\r\n911545593909470,SUC\r\n911545598812004,CHB\r\n',
    })
    expect(queries.asked.exportRows).toEqual([['E', 'I']])
    expect(audit.entries).toEqual([
      {
        userId: ANALYST_ID,
        action: 'settlement.export',
        entityType: 'SettlementBatch',
        entityId: EXAMPLE_BATCH_ID,
        detail: { type: 'transactions', fileName: 'ProviderA-USD_B123_A1_transactions.csv', rows: 2 },
      },
    ])
  })

  it('generates the RR from the R rows with the batch number', async () => {
    const { service, queries, audit } = setup({ exportRows: rows })
    const file = await service.export(MERCHANT_1, ANALYST_ID, EXAMPLE_BATCH_ID, 'reserves')
    expect(file.body).toBe('ID,Description\r\n911545512345678,Batch 123\r\n')
    expect(queries.asked.exportRows).toEqual([['R']])
    expect(audit.entries[0]!.detail).toEqual({
      type: 'reserves',
      fileName: 'ProviderA-USD_B123_A1_reserves.csv',
      rows: 1,
    })
  })

  it('audits with the batch id in lower case, as the cleanup and the reader look it up', async () => {
    const { service, audit } = setup({ exportRows: rows })
    await service.export(MERCHANT_1, ANALYST_ID, EXAMPLE_BATCH_ID.toUpperCase(), 'reserves')
    expect(audit.entries[0]!.entityId).toBe(EXAMPLE_BATCH_ID)
  })

  it('generates the summary from the view read with the scope, with rows null in the audit', async () => {
    const { service, reader, queries, audit } = setup()
    const file = await service.export(MERCHANT_1, ANALYST_ID, EXAMPLE_BATCH_ID, 'summary')
    expect(file.fileName).toBe('ProviderA-USD_B123_A1_summary.csv')
    expect(file.body.startsWith('Field,Value\r\nAccount,ProviderA-USD\r\n')).toBe(true)
    expect(reader.scopes).toEqual([MERCHANT_1])
    // The example view warns only transactional_fees_not_computed: nothing to translate, no query.
    expect(queries.asked.sourceIds).toEqual([])
    expect(audit.entries[0]!.detail).toEqual({ type: 'summary', fileName: file.fileName, rows: null })
  })

  it('translates only the transactions of the warnings to their source id (an undated_adjustment)', async () => {
    const view: SettlementView = exampleView({ warnings: [UNDATED, { code: 'transactional_fees_not_computed' }] })
    const { service, queries } = setup(
      { sourceIds: new Map([['40711', '911545598812004']]) },
      new Map([[EXAMPLE_BATCH_ID, view]]),
    )
    const { body } = await service.export(MERCHANT_1, ANALYST_ID, EXAMPLE_BATCH_ID, 'summary')
    expect(queries.asked.sourceIds).toEqual([['40711']])
    expect(body).toContain('\r\nundated_adjustment,911545598812004,Row 7; fee skipped\r\n')
  })

  it('answers 404 Settlement outside the scope, without generating nor auditing', async () => {
    const { service, queries, audit } = setup({ exportRows: rows })
    await expect(service.export(MERCHANT_1, ANALYST_ID, OTHER_BATCH, 'transactions')).rejects.toThrow(
      'Settlement not found',
    )
    expect(queries.asked.exportRows).toEqual([])
    expect(audit.entries).toEqual([])
  })

  it('propagates a failed audit and answers no file', async () => {
    const { service, audit } = setup({ exportRows: rows })
    audit.failWith = new Error('audit down')
    await expect(service.export(MERCHANT_1, ANALYST_ID, EXAMPLE_BATCH_ID, 'transactions')).rejects.toThrow('audit down')
  })

  it('does not audit when the generation fails', async () => {
    const { service, queries, audit } = setup({ exportRows: rows })
    queries.failExportRowsWith = new Error('read failed')
    await expect(service.export(MERCHANT_1, ANALYST_ID, EXAMPLE_BATCH_ID, 'transactions')).rejects.toThrow(
      'read failed',
    )
    const missing = setup({}, new Map([[EXAMPLE_BATCH_ID, exampleView({ warnings: [UNDATED] })]]))
    await expect(missing.service.export(MERCHANT_1, ANALYST_ID, EXAMPLE_BATCH_ID, 'summary')).rejects.toThrow(/40711/)
    expect([...audit.entries, ...missing.audit.entries]).toEqual([])
  })

  it('writes one audit entry per download and changes nothing else', async () => {
    const { service, audit } = setup({ exportRows: rows })
    for (let i = 0; i < 3; i++) await service.export(MERCHANT_1, ANALYST_ID, EXAMPLE_BATCH_ID, 'transactions')
    expect(audit.entries.map((e) => e.action)).toEqual(['settlement.export', 'settlement.export', 'settlement.export'])
  })
})
