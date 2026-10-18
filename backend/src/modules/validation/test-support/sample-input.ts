/**
 * The engine input of each sample of data/samples without a database (design D9): the real analysis of #5 over the
 * .xlsx files (ImportService with the import doubles), projected to ValidationRow, plus history, candidates and
 * registered missing findings from the validation doubles over the synthetic world.
 */
import type { MappingConfirmation } from '@recon/shared'
import { InMemoryAuditLogger } from '../../../test-support/in-memory-audit-logger.js'
import type { AccountName } from '../../catalog/application/__fakes__/in-memory.js'
import {
  ACCOUNT_IDS,
  FakeWorkbookReader,
  InMemoryFileStore,
  InMemoryImportRepository,
  InMemoryMatchingRulesRepository,
  SAMPLE_FILES,
  type SampleFile,
  sequentialIds,
} from '../../imports/application/__fakes__/in-memory.js'
import {
  InMemoryAccountContext,
  InMemoryFeeTypeCatalog,
  InMemoryImportRowRepository,
  InMemoryTransactionLookup,
} from '../../imports/application/__fakes__/in-memory-analysis.js'
import { ImportService } from '../../imports/application/import-service.js'
import { InMemoryValidationSources } from '../application/__fakes__/in-memory.js'
import type { CycleRanges, ValidationInput, ValidationRow } from '../domain/types.js'
import { STATUSES } from './builders.js'

export type SampleName = 'batch-clean' | 'batch-split' | 'batch-issues' | 'batch-blocked' | 'legacy-provider'

export const SAMPLES: Record<SampleName, { account: AccountName; files: SampleFile[] }> = {
  'batch-clean': { account: 'ProviderA-USD', files: [SAMPLE_FILES.batchClean] },
  'batch-split': { account: 'ProviderA-USD', files: [SAMPLE_FILES.part1, SAMPLE_FILES.part2] },
  'batch-issues': { account: 'ProviderB-Main', files: [SAMPLE_FILES.batchIssues] },
  'batch-blocked': { account: 'ProviderB-Main', files: [SAMPLE_FILES.batchBlocked] },
  'legacy-provider': { account: 'ProviderC-Alt', files: [SAMPLE_FILES.legacy] },
}

const ANALYST = { merchantIds: [1, 2] }
const ANALYST_ID = 2

// Stub until group 6 (ranges.ts): no range, so no candidates are loaded.
const computeRanges = (_rows: readonly ValidationRow[]): CycleRanges => ({ APP: null, DEC: null, I: null, R: null })

export interface SampleInput {
  importId: string
  input: ValidationInput
  sources: InMemoryValidationSources
}

/** Upload → confirm the proposal → analyze, exactly as the API does it. */
async function analyzed(name: SampleName) {
  const sample = SAMPLES[name]
  const imports = new InMemoryImportRepository()
  const files = new InMemoryFileStore()
  const transactions = new InMemoryTransactionLookup()
  const rows = new InMemoryImportRowRepository(imports, transactions)
  const service = new ImportService({
    imports,
    files,
    reader: new FakeWorkbookReader(),
    rules: new InMemoryMatchingRulesRepository(),
    ids: sequentialIds(),
    log: { error: () => {}, warn: () => {} },
    rows,
    transactions,
    accounts: new InMemoryAccountContext(),
    feeTypes: new InMemoryFeeTypeCatalog(),
    audit: new InMemoryAuditLogger(),
    limits: { maxRowsPerImport: 100_000 },
  })
  const staged = await Promise.all(
    sample.files.map(async (f) => ({ fileName: f.fileName, ...(await files.stageBytes(f.bytes)) })),
  )
  const detail = await service.createImport(ANALYST, ANALYST_ID, ACCOUNT_IDS[sample.account], staged)
  await service.confirmMapping(ANALYST, detail.importId, proposalOf(detail))
  await service.analyze(ANALYST, detail.importId)
  return { importId: detail.importId, imports, rows }
}

function proposalOf(detail: Awaited<ReturnType<ImportService['createImport']>>): MappingConfirmation {
  return {
    sheets: detail.files.flatMap((file) =>
      file.sheets.map((sheet) => {
        if (sheet.proposed.kind === null) throw new Error(`sheet ${sheet.sheetName} has no proposal`)
        return {
          sheetId: sheet.sheetId,
          kind: sheet.proposed.kind,
          cycle: sheet.proposed.cycle,
          statusId: sheet.proposed.statusId,
          columns: sheet.columns.flatMap((c) =>
            c.targetField === null ? [] : [{ sourceColumn: c.sourceColumn, targetField: c.targetField }],
          ),
        }
      }),
    ),
  }
}

/** The two steps #9 will run (design D2): rows → ranges → candidates and history → full input. */
async function build(name: SampleName): Promise<SampleInput> {
  const { importId, imports, rows: importRows } = await analyzed(name)
  const sources = new InMemoryValidationSources({ imports, rows: importRows })
  const rows = await sources.rowsOf(importId)
  const account = await sources.accountOf(importId)
  const ranges = computeRanges(rows)
  const candidates = await sources.candidates(account, ranges)
  const reserveCandidates = ranges.R === null ? [] : await sources.heldReserves(account, ranges.R.max)
  const ids = new Set<bigint>()
  for (const r of rows) if (r.transaction) ids.add(r.transaction.transactionId)
  for (const c of candidates) ids.add(c.transactionId)
  for (const c of reserveCandidates) ids.add(c.transactionId)
  const input: ValidationInput = {
    account,
    rows,
    history: await sources.movements(account.providerId, [...ids]),
    hasPreviousBatches: await sources.hasPreviousBatches(account.providerId, importId),
    candidates,
    reserveCandidates,
    registeredMissing: await sources.registered(account.providerId),
    statuses: STATUSES,
  }
  return { importId, input, sources }
}

const cache = new Map<SampleName, Promise<SampleInput>>()

/** Built once per sample and test file; callers must not mutate it. */
export function sampleInput(name: SampleName): Promise<SampleInput> {
  let pending = cache.get(name)
  if (!pending) {
    pending = build(name)
    cache.set(name, pending)
  }
  return pending
}
