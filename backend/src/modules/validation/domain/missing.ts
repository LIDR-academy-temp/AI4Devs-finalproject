import type { Cycle } from '@recon/shared'
import { reserveExpiry } from './ranges.js'
import type { SlotOutput, ValidationContext } from './run-validations.js'

/** What the missing computation reads: the whole context but its own result. */
type MissingContext = Omit<ValidationContext, 'missingIssues'>

import type { DateRange, Issue, MissingRange, MissingType } from './types.js'

/** A money decimal string equal to zero ("0", "0.0000", ".00"): no number, no dependency (design D2). */
const isZero = (amount: string) => /^0*(\.0*)?$/.test(amount)

interface Candidate {
  range: MissingRange
  cycle: Cycle
  transactionId: bigint
  transactionIdRaw: string
  statusId: number
  date: Date
}

/**
 * Candidates of each range with a value (questions 8–10): APP Successful, DEC Declined, I natural-cycle-I statuses
 * (by the date of the change), R held reserves with an amount held and nothing released early. Only channels whose
 * primary account is this one; never present in the batch in that cycle, processed in that cycle in a live attempt
 * (re-checked here although the source already leaves them out, D3) or registered as missing.
 */
function candidatesOf(ctx: MissingContext): Candidate[] {
  const { input, catalog, ranges } = ctx
  const successful = catalog.idOf('Successful')
  const declined = catalog.idOf('Declined')
  const out: Candidate[] = []
  for (const c of input.candidates) {
    if (!input.account.primaryChannelIds.has(c.channelId)) continue
    const raw = c.sourceTransactionId
    if (c.statusId === successful && ranges.APP !== null)
      out.push({
        range: 'APP',
        cycle: 'E',
        transactionId: c.transactionId,
        transactionIdRaw: raw,
        statusId: c.statusId,
        date: c.transactionDate,
      })
    else if (c.statusId === declined && ranges.DEC !== null)
      out.push({
        range: 'DEC',
        cycle: 'E',
        transactionId: c.transactionId,
        transactionIdRaw: raw,
        statusId: c.statusId,
        date: c.transactionDate,
      })
    else if (catalog.naturalCycle(c.statusId) === 'I' && ranges.I !== null && c.lastStatusChangedAt !== null)
      out.push({
        range: 'I',
        cycle: 'I',
        transactionId: c.transactionId,
        transactionIdRaw: raw,
        statusId: c.statusId,
        date: c.lastStatusChangedAt,
      })
  }
  if (ranges.R !== null) {
    for (const r of input.reserveCandidates) {
      if (!input.account.primaryChannelIds.has(r.channelId)) continue
      if (isZero(r.reserveHeldAmt) || !isZero(r.reserveEarlyReleasedAmt)) continue
      out.push({
        range: 'R',
        cycle: 'R',
        transactionId: r.transactionId,
        transactionIdRaw: r.sourceTransactionId,
        statusId: r.statusId,
        date: reserveExpiry(input.account, r.channelId, r.transactionDate),
      })
    }
  }
  return out.filter(
    (c) =>
      !ctx.present[c.cycle].has(c.transactionId) &&
      !ctx.processed[c.cycle].has(c.transactionId) &&
      !input.registeredMissing.has(`${c.cycle}:${c.transactionId}`),
  )
}

/** Before the min → previous_to_batch; within [min, max], inclusive → in_range; after the max → not considered. */
function classify(date: Date, range: DateRange): MissingType | null {
  if (date < range.min) return 'previous_to_batch'
  if (date <= range.max) return 'in_range'
  return null
}

/** Every missing finding of the run, once: buildContext keeps them in the context for the two slots (L4). */
export function computeMissing(ctx: MissingContext): Issue[] {
  const issues: Issue[] = []
  const seen = new Set<string>()
  for (const c of candidatesOf(ctx)) {
    const missingType = classify(c.date, ctx.ranges[c.range]!)
    const key = `${c.range}:${c.transactionId}`
    if (missingType === null || seen.has(key)) continue
    seen.add(key)
    issues.push({
      issueType: 'missing',
      scope: missingType,
      blocking: false,
      transactionIdRaw: c.transactionIdRaw,
      transactionId: c.transactionId,
      cycle: c.cycle,
      statusId: c.statusId,
      missingType,
      missingRange: c.range,
      relevantDate: c.date,
      occurrences: [],
    })
  }
  return issues
}

const anyRange = (ctx: ValidationContext) => Object.values(ctx.ranges).some((r) => r !== null)

export function missingPreviousToBatch(ctx: ValidationContext): SlotOutput {
  return { applicable: anyRange(ctx), issues: ctx.missingIssues.filter((i) => i.missingType === 'previous_to_batch') }
}

export function missingInRange(ctx: ValidationContext): SlotOutput {
  return { applicable: anyRange(ctx), issues: ctx.missingIssues.filter((i) => i.missingType === 'in_range') }
}

/** Pending transactions of the account's channels created within the APP or the DEC range, once each (question 10). */
export function pendingInRangeCount(ctx: ValidationContext): number {
  const pending = ctx.catalog.idOf('Pending')
  const within = (date: Date, range: DateRange | null) => range !== null && date >= range.min && date <= range.max
  const counted = new Set<bigint>()
  for (const c of ctx.input.candidates) {
    if (c.statusId !== pending || !ctx.input.account.primaryChannelIds.has(c.channelId)) continue
    if (within(c.transactionDate, ctx.ranges.APP) || within(c.transactionDate, ctx.ranges.DEC))
      counted.add(c.transactionId)
  }
  return counted.size
}

/**
 * I candidates without a status change date (L2): they cannot be classified against the I range, so instead of
 * dropping them silently the run counts them (informative), with the same exclusions as any candidate.
 */
export function undatedCandidateCount(ctx: ValidationContext): number {
  if (ctx.ranges.I === null) return 0
  const counted = new Set<bigint>()
  for (const c of ctx.input.candidates) {
    if (c.lastStatusChangedAt !== null || !ctx.input.account.primaryChannelIds.has(c.channelId)) continue
    if (ctx.catalog.naturalCycle(c.statusId) !== 'I') continue
    if (ctx.present.I.has(c.transactionId) || ctx.processed.I.has(c.transactionId)) continue
    if (ctx.input.registeredMissing.has(`I:${c.transactionId}`)) continue
    counted.add(c.transactionId)
  }
  return counted.size
}
