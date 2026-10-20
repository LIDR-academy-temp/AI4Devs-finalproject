// Reads of an attempt and its exports (summary-exports design D2, D3, D10, D11; README §4.4). The scope is checked on
// the batch header before anything else (the same 404 for unknown and foreign), the view is #11's reader with the
// caller's scope, Settled comes from the attempt, and every download is audited after generating and before answering.
import type {
  AccountSettlementsPage,
  AccountSettlementsQuery,
  ExportType,
  ImportSettlements,
  SettlementTransactionsPage,
  SettlementTransactionsQuery,
  SettlementView,
} from '@recon/shared'
import type { AuditLogger } from '../../../shared/audit.js'
import { NotFoundError } from '../../../shared/errors.js'
import type { Scope } from '../../catalog/domain/scope.js'
import { exportFileName } from '../domain/exports/file-name.js'
import { reservesCsv } from '../domain/exports/reserves-csv.js'
import { summaryCsv, warningTransactionIds } from '../domain/exports/summary-csv.js'
import { transactionsCsv } from '../domain/exports/transactions-csv.js'
import { isSettled } from '../domain/settled.js'
import type { SettlementReader } from './ports.js'
import type { BatchHeader, SettlementQueries } from './read-ports.js'

export interface SettlementReadServiceDeps {
  queries: SettlementQueries
  /** #11's reader, unchanged. */
  reader: SettlementReader
  audit: AuditLogger
}

export interface ExportedFile {
  fileName: string
  body: string
}

export class SettlementReadService {
  constructor(private readonly deps: SettlementReadServiceDeps) {}

  async view(scope: Scope, batchId: string): Promise<SettlementView> {
    await this.header(scope, batchId)
    return this.readView(scope, batchId)
  }

  async transactions(
    scope: Scope,
    batchId: string,
    query: SettlementTransactionsQuery,
  ): Promise<SettlementTransactionsPage> {
    const header = await this.header(scope, batchId)
    const { items, total } = await this.deps.queries.movementsPage(batchId, query.type, query.page, query.pageSize)
    const settled = isSettled(header.status)
    return {
      batchId: header.batchId,
      type: query.type,
      page: query.page,
      pageSize: query.pageSize,
      total,
      items: items.map((m) => ({ ...m, settled })),
    }
  }

  async importSettlements(scope: Scope, importId: string): Promise<ImportSettlements> {
    const attempts = await this.deps.queries.importAttempts(scope, importId)
    if (attempts === null) throw new NotFoundError('Import')
    return attempts
  }

  /** The scope is in the port's query: an unknown account and a foreign one answer the same 404. */
  async accountSettlements(
    scope: Scope,
    accountId: string,
    query: AccountSettlementsQuery,
  ): Promise<AccountSettlementsPage> {
    const found = await this.deps.queries.accountSettlements(scope, accountId, query)
    if (found === null) throw new NotFoundError('Account')
    return { accountId, page: query.page, pageSize: query.pageSize, total: found.total, items: found.items }
  }

  /** Generates the file in memory and audits the download; a failed audit fails the request and sends nothing. */
  async export(scope: Scope, userId: number, batchId: string, type: ExportType): Promise<ExportedFile> {
    const header = await this.header(scope, batchId)
    const fileName = exportFileName(header.accountName, header.batchNo, header.attemptNo, type)
    const { body, rows } = await this.generate(scope, header, type)
    await this.deps.audit.record({
      userId,
      action: 'settlement.export',
      entityType: 'SettlementBatch',
      // Lower case, as the processing audit and the cleanups look it up.
      entityId: header.batchId.toLowerCase(),
      detail: { type, fileName, rows },
    })
    return { fileName, body }
  }

  private async generate(
    scope: Scope,
    header: BatchHeader,
    type: ExportType,
  ): Promise<{ body: string; rows: number | null }> {
    switch (type) {
      case 'transactions':
        return transactionsCsv(await this.deps.queries.exportRows(header.batchId, ['E', 'I']))
      case 'reserves':
        return reservesCsv(await this.deps.queries.exportRows(header.batchId, ['R']), header.batchNo)
      case 'summary': {
        const view = await this.readView(scope, header.batchId)
        const ids = warningTransactionIds(view)
        const sourceIds = ids.length === 0 ? new Map<string, string>() : await this.deps.queries.sourceIds(ids)
        return { body: summaryCsv(view, sourceIds), rows: null }
      }
    }
  }

  private async header(scope: Scope, batchId: string): Promise<BatchHeader> {
    const header = await this.deps.queries.batchHeader(scope, batchId)
    if (header === null) throw new NotFoundError('Settlement')
    return header
  }

  private async readView(scope: Scope, batchId: string): Promise<SettlementView> {
    const view = await this.deps.reader.view(batchId, scope)
    if (view === null) throw new NotFoundError('Settlement')
    return view
  }
}
