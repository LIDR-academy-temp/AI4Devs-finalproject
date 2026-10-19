// What a run stores beyond the columns (validation-runs design D5): the breakdown of each result and the detailJson of
// each finding. Shared by the Prisma repository and its in-memory double so both store the same thing.
import type { Issue, ValidationResult } from '../domain/types.js'

export type StoredBreakdown = { byRange: Record<string, number> } | { byIssueType: Record<string, number> }

/** missing_*: findings by range; non_recorded_adjustment: by issue type; null for the rest (not #13's amounts). */
export function breakdownOf(result: ValidationResult): StoredBreakdown | null {
  if (result.code === 'missing_previous_to_batch' || result.code === 'missing_in_range') {
    const byRange: Record<string, number> = { APP: 0, DEC: 0, I: 0, R: 0 }
    for (const issue of result.issues) if (issue.missingRange) byRange[issue.missingRange]! += 1
    return { byRange }
  }
  if (result.code === 'non_recorded_adjustment') {
    const byIssueType: Record<string, number> = { non_recorded_adjustment: 0, status_mismatch: 0 }
    for (const issue of result.issues) byIssueType[issue.issueType] = (byIssueType[issue.issueType] ?? 0) + 1
    return { byIssueType }
  }
  return null
}

/** The flat breakdown the API answers, from what breakdownOf stored. */
export function breakdownView(stored: StoredBreakdown | null): Record<string, number> | null {
  if (stored === null) return null
  return 'byRange' in stored ? stored.byRange : stored.byIssueType
}

export interface IssueDetailJson {
  missingRange?: string
  gatewayStatusId?: number
  source?: { fileId: string; sheetId: string; rowNo: number }
}

/** Only the keys present: the range of a missing finding (APP and DEC share cycle E), gateway status, source row. */
export function issueDetailOf(issue: Issue): IssueDetailJson | null {
  const detail: IssueDetailJson = {}
  if (issue.missingRange !== undefined) detail.missingRange = issue.missingRange
  if (issue.gatewayStatusId !== undefined) detail.gatewayStatusId = issue.gatewayStatusId
  if (issue.source !== undefined) detail.source = issue.source
  return Object.keys(detail).length === 0 ? null : detail
}
