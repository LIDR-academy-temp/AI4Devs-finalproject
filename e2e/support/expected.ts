// The oracle of each sample: data/samples/<sample>/expected.json, read as it is (design D3). The steps take every
// figure from here and never write one.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export type RangeKey = 'APP' | 'DEC' | 'I' | 'R'
export type ValidationOutcome = 'passed' | 'warning' | 'blocked' | 'not_applicable'

/** Only the fields the steps use; the JSON has more. */
export interface Expected {
  account: string
  files: string[]
  rows: {
    read: number
    matched: number
    unmatched: number
    ambiguous?: number
    ignoredEmptyId?: number
    unmatchedByReason?: Record<'no_match' | 'id_format' | 'lossy_numeric_id' | 'no_gateways', number>
  }
  /** The date ranges the validations use, as days: [first, last]. */
  ranges?: Record<RangeKey, [string, string]>
  warnings?: { newChannels: string[] }
  validations?: Record<string, number | Record<string, number>>
  /** The result of each validation, when the oracle writes it; otherwise outcomeOf derives it. */
  outcomes?: Record<string, ValidationOutcome>
  affectedIds?: { provider_mismatch?: string[] }
  likelyWrongAccount?: boolean
  requiresEmptyBatchConfirmation?: boolean
  batchFeesPrefilled?: { feeType: string; amount: number }[]
  proposedBatchNo?: number
  summary?: { otherFeeAmt: string; amountPayable: string }
}

/** The path of a file of a sample, relative to the repository root, as the upload step takes it. */
export const sampleFile = (sample: string, file: string) => `data/samples/${sample}/${file}`

export function expectedOf(sample: string): Expected {
  const path = fileURLToPath(new URL(`../../${sampleFile(sample, 'expected.json')}`, import.meta.url))
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Expected
  } catch (error) {
    throw new Error(`The oracle of ${sample} could not be read at ${path}: ${(error as Error).message}`)
  }
}

/**
 * The result of a validation: the one of the oracle when it writes it (batch-wrong-account), otherwise from its
 * findings, as the API decides it for an applicable validation: none is passed, any is a warning, and provider_mismatch,
 * the only blocking validation, is blocked.
 */
export function outcomeOf(expected: Expected, code: string, findings: number): ValidationOutcome {
  const written = expected.outcomes?.[code]
  if (written) return written
  if (findings === 0) return 'passed'
  return code === 'provider_mismatch' ? 'blocked' : 'warning'
}

const DECIMAL = /^(-?)(\d+)(?:\.(\d+))?$/

/** Two decimal texts with the same value, compared as text (never as a JS number): "25.0000" is "25". */
export function sameDecimal(a: string, b: string): boolean {
  const canonical = (value: string) => {
    const match = DECIMAL.exec(value.trim())
    if (!match) return undefined
    const [, sign, integer, fraction = ''] = match
    const digits = `${integer!.replace(/^0+(?=\d)/, '')}.${fraction.replace(/0+$/, '')}`.replace(/\.$/, '')
    return digits === '0' ? digits : `${sign}${digits}`
  }
  const left = canonical(a)
  return left !== undefined && left === canonical(b)
}

/**
 * A decimal string as the screens show it: thousands grouped, decimals kept. A copy of formatDecimal of
 * frontend/src/lib/format.ts, because e2e does not import the frontend; if that one changes, this one follows.
 */
export function formatAmount(value: string): string {
  const negative = value.startsWith('-')
  const [integer = '', fraction] = (negative ? value.slice(1) : value).split('.')
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${negative ? '-' : ''}${grouped}${fraction === undefined ? '' : `.${fraction}`}`
}
