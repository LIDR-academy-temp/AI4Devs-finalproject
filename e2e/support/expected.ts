// The oracle of each sample: data/samples/<sample>/expected.json, read as it is (design D3). The steps take every
// figure from here and never write one.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** Only the fields the steps use; the JSON has more. */
export interface Expected {
  account: string
  files: string[]
  rows: {
    read: number
    matched: number
    unmatched: number
    unmatchedByReason?: Record<'no_match' | 'id_format' | 'lossy_numeric_id' | 'no_gateways', number>
  }
  warnings?: { newChannels: string[] }
  validations?: Record<string, number | Record<string, number>>
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

/** A decimal string as the screens show it (formatDecimal of the frontend): thousands grouped, decimals kept. */
export function formatAmount(value: string): string {
  const negative = value.startsWith('-')
  const [integer = '', fraction] = (negative ? value.slice(1) : value).split('.')
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${negative ? '-' : ''}${grouped}${fraction === undefined ? '' : `.${fraction}`}`
}
