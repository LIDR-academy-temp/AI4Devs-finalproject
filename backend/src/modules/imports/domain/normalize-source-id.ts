// External identity (README §1.2 "Identidad"): the id read from the file, normalized per gateway format before
// it is looked up. Pure; never guesses or completes an id (design D4).
import type { RowReason } from '@recon/shared'

export type IdFormat = 'numeric' | 'uuid'

export interface GatewayFormat {
  gatewayId: number
  idFormat: IdFormat
}

/** A (gatewayId, sourceTransactionId) pair to look up. */
export interface IdCandidate {
  gatewayId: number
  sourceTransactionId: string
}

export type CandidateOutcome =
  | { kind: 'candidates'; candidates: IdCandidate[]; idLength: boolean }
  | { kind: 'ignored'; reason: 'empty_id' }
  | { kind: 'unmatched'; reason: Extract<RowReason, 'lossy_numeric_id' | 'no_gateways' | 'id_format'> }

const DIGITS = /^\d+$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
/** README §1.2: numeric ids have 15 digits today, had 16 for a while; outside 12–17 is worth a warning. */
const NUMERIC_MIN_DIGITS = 12
const NUMERIC_MAX_DIGITS = 17

/**
 * `numeric`: trimmed, digits only, no leading zeros. `uuid`: trimmed, braces removed, lowercase, 8-4-4-4-12.
 * Returns null when the text does not fit the format.
 */
export function normalizeSourceId(raw: string, idFormat: IdFormat): string | null {
  const text = raw.trim()
  if (idFormat === 'numeric') {
    if (!DIGITS.test(text)) return null
    return text.replace(/^0+(?=\d)/, '')
  }
  const unwrapped = text.startsWith('{') && text.endsWith('}') ? text.slice(1, -1) : text
  const lower = unwrapped.toLowerCase()
  return UUID.test(lower) ? lower : null
}

/** A normalized numeric id outside 12–17 digits is valid to look up but worth a warning (spec: import, D4). */
export function idLengthWarning(normalized: string, idFormat: IdFormat): boolean {
  if (idFormat !== 'numeric') return false
  return normalized.length < NUMERIC_MIN_DIGITS || normalized.length > NUMERIC_MAX_DIGITS
}

/**
 * The candidates of one id cell across the gateways of the account, or why there are none: an empty cell is
 * ignored (global row rule), a cell that lost precision is never looked up, no gateways or no format that fits.
 */
export function candidatesFor(raw: string, lossyNumeric: boolean, gateways: GatewayFormat[]): CandidateOutcome {
  if (raw.trim() === '') return { kind: 'ignored', reason: 'empty_id' }
  if (lossyNumeric) return { kind: 'unmatched', reason: 'lossy_numeric_id' }
  if (gateways.length === 0) return { kind: 'unmatched', reason: 'no_gateways' }
  const candidates: IdCandidate[] = []
  let idLength = false
  for (const gateway of gateways) {
    const normalized = normalizeSourceId(raw, gateway.idFormat)
    if (normalized === null) continue
    candidates.push({ gatewayId: gateway.gatewayId, sourceTransactionId: normalized })
    if (idLengthWarning(normalized, gateway.idFormat)) idLength = true
  }
  if (candidates.length === 0) return { kind: 'unmatched', reason: 'id_format' }
  return { kind: 'candidates', candidates, idLength }
}
