// Texts of the validations block of Analysis & Validations (web-shell "Textos de interfaz en inglés y
// centralizados"). Those fixed by the spec of web-validations are literal.
import type { ImportStatus, MissingRange, ValidationCode, ValidationOutcome } from '@recon/shared'

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
}
