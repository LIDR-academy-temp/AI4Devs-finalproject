import type { BatchStatus, ImportStatus, SettledStatus, ValidationOutcome } from '@recon/shared'

/** The Badge variant of a status: the colour answers "is anything still pending?" (design D8). */
export type Tone = 'success' | 'warning' | 'danger' | 'neutral'

/** Overall state of a validation run, as `RunHeader` presents it. */
export type RunOverall = 'passed' | 'warnings' | 'blocked'

// One map per enumeration: `satisfies` breaks typecheck when @recon/shared adds a value.
export const VALIDATION_OUTCOME_TONE = {
  passed: 'success',
  warning: 'warning',
  blocked: 'danger',
  not_applicable: 'neutral',
  not_implemented: 'neutral',
} as const satisfies Record<ValidationOutcome, Tone>

export const RUN_OVERALL_TONE = {
  passed: 'success',
  warnings: 'warning',
  blocked: 'danger',
} as const satisfies Record<RunOverall, Tone>

export const IMPORT_STATUS_TONE = {
  uploaded: 'neutral',
  mapped: 'neutral',
  analyzed: 'neutral',
  validated: 'success',
  processed: 'success',
  cancelled: 'neutral',
} as const satisfies Record<ImportStatus, Tone>

export const BATCH_STATUS_TONE = {
  processed: 'warning',
  paid: 'success',
  undone: 'neutral',
} as const satisfies Record<BatchStatus, Tone>

export const SETTLED_STATUS_TONE = {
  pending_payment: 'warning',
  settled: 'success',
  undone: 'neutral',
} as const satisfies Record<SettledStatus, Tone>

/**
 * The colours of a notice that explains a status, by tone, as the Badge takes them from its variant: the same theme
 * pairs whose contrast was calculated (design D8). Literal strings, so Tailwind generates them.
 */
export const TONE_NOTICE_CLASS = {
  success: 'border-status-success-foreground/40 bg-status-success text-status-success-foreground',
  warning: 'border-status-warning-foreground/40 bg-status-warning text-status-warning-foreground',
  danger: 'border-status-danger-foreground/40 bg-status-danger text-status-danger-foreground',
  neutral: 'border-status-neutral-foreground/40 bg-status-neutral text-status-neutral-foreground',
} as const satisfies Record<Tone, string>

/** The tone of a value in its map; a value the map does not know (one added at runtime) is neutral. */
export function toneOf<K extends string>(map: Record<K, Tone>, value: string): Tone {
  return Object.hasOwn(map, value) ? map[value as K] : 'neutral'
}
