// Texts of the validations block of Analysis & Validations (web-shell "Textos de interfaz en inglés y
// centralizados"). Those fixed by the spec of web-validations are literal.
import type {
  ImportStatus,
  IssueScope,
  IssueType,
  MissingRange,
  ValidationCode,
  ValidationOutcome,
} from '@recon/shared'

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

export const strings = {
  title: 'Validations',
  loading: 'Loading the validations…',
  loadError: 'The validations could not be loaded.',
  retry: 'Retry',
  noRun: 'No validation run yet.',

  run: {
    first: 'Run validations',
    again: 'Run again',
    running: 'Running the validations…',
    importChanged: 'The import changed while the validations ran. The results were reloaded.',
    notAnalyzed: (status: ImportStatus) => `The validations cannot run on a ${status} import.`,
    forbidden: 'You cannot run the validations.',
    failed: 'The validations could not run. Try again.',
    confirm: {
      title: 'Run the validations again?',
      lostChanges: (count: number) =>
        `Running the validations again discards ${plural(count, 'manual change', 'manual changes')} (inclusions and resolutions).`,
      invalidatesReview: 'The current review will be invalidated and the import returns to analyzed.',
      keep: 'Keep the current run',
      confirm: 'Run again',
    },
  },

  header: {
    label: 'Validation run',
    overall: { blocked: 'Blocked', warnings: 'Warnings', passed: 'Passed' },
    run: (runId: number, at: string, userName: string) => `Run #${runId} · ${at} · ${userName}`,
    ranges: 'Ranges used',
    noRange: '—',
    counters: 'Informative counters',
    pendingInRange: 'Pending in range',
    undatedAdjustments: 'Undated adjustments',
    undatedCandidates: 'Undated candidates',
  },

  table: {
    label: 'Validation results',
    validation: 'Validation',
    outcome: 'Result',
    findings: 'Findings',
    blocking: 'Blocking',
    breakdown: 'Breakdown',
    blocks: 'Blocks',
    none: '—',
  },

  validations: {
    provider_mismatch: 'Provider mismatch',
    non_recorded_adjustment: 'Non-recorded adjustment',
    duplicate_in_batch: 'Duplicate in batch',
    status_collision_in_batch: 'Status collision in batch',
    duplicate_across_batches: 'Duplicate across batches',
    status_collision_across_batches: 'Status collision across batches',
    missing_previous_to_batch: 'Missing previous to batch',
    missing_in_range: 'Missing in range',
  } satisfies Record<ValidationCode, string>,

  outcomes: {
    passed: 'Passed',
    warning: 'Warning',
    blocked: 'Blocked',
    not_applicable: 'n/a',
    not_implemented: 'Not implemented',
  } satisfies Record<ValidationOutcome, string>,

  breakdown: {
    non_recorded_adjustment: (count: number) => plural(count, 'non-recorded adjustment', 'non-recorded adjustments'),
    status_mismatch: (count: number) => plural(count, 'status mismatch', 'status mismatches'),
    range: (range: MissingRange, count: number) => `${range} ${count}`,
  },

  issueTypes: {
    provider_mismatch: 'Provider mismatch',
    non_recorded_adjustment: 'Non-recorded adjustment',
    status_mismatch: 'Status mismatch',
    duplicate: 'Duplicate',
    collision: 'Collision',
    missing: 'Missing',
  } satisfies Record<IssueType, string>,

  scopes: {
    in_batch: 'in batch',
    across_batches: 'across batches',
    previous_to_batch: 'previous to batch',
    in_range: 'in range',
  } satisfies Record<IssueScope, string>,

  resolution: { persistent: 'Persistent', resolved: 'Resolved' },

  list: {
    label: (validation: string) => `Findings of ${validation}`,
    table: 'Findings',
    id: 'ID',
    cycle: 'Cycle',
    type: 'Type',
    reported: 'Reported status',
    gateway: 'Gateway status',
    range: 'Range',
    included: 'Included',
    resolution: 'Resolution',
    none: '—',
    empty: 'No findings.',
    loadError: 'The findings could not be loaded.',
    pageOf: (page: number, pages: number, total: number) =>
      `Page ${page} of ${pages} · ${plural(total, 'finding', 'findings')}`,
    previous: 'Previous',
    next: 'Next',
  },

  drawer: {
    loading: 'Finding',
    loadError: 'The finding could not be loaded.',
    title: (validation: string, id: string) => `${validation} · ${id}`,
    superseded: 'This finding belongs to a superseded run.',
    type: 'Type',
    cycle: 'Cycle',
    reported: 'Reported status',
    gateway: 'Gateway status',
    range: 'Range',
    relevantDate: 'Date',
    source: 'Row',
    occurrences: 'Occurrences',
    noOccurrences: 'No occurrences: the transaction is not in this batch.',
    location: (fileName: string, sheetName: string, rowNo: number) => `${fileName} · ${sheetName} · row ${rowNo}`,
    batch: (batchNo: number, attemptNo: number, accountName: string) =>
      `Batch #${batchNo} · attempt ${attemptNo} · ${accountName}`,
    noLocation: 'Movement without a row',
    unresolvedStatus: 'Unresolved status',
    chb2: 'CHB 2',
    includedByDefault: 'Included by default',
    excludedByDefault: 'Excluded by default',
    included: 'Included',
    excluded: 'Excluded',
    changedBy: (userName: string, at: string) => `Changed by ${userName} · ${at}`,
    resolvedBy: (userName: string, at: string) => `Resolved by ${userName} · ${at}`,
    history: 'History',
    noHistory: 'No changes yet.',
    inclusionEntry: (userName: string, at: string, where: string, from: boolean, to: boolean) =>
      `${userName} · ${at} · ${where} · ${from ? 'included' : 'excluded'} → ${to ? 'included' : 'excluded'}`,
    resolveEntry: (userName: string, at: string, note: string) => `${userName} · ${at} · resolved: "${note}"`,
  },
}
