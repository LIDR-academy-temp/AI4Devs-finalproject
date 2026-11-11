// The fixed order of the findings of a run (validation-runs design D8), independent of the IDENTITY order: validation,
// cycle (E, I, R, none last), range (APP, DEC, I, R, none last), relevantDate, transactionIdRaw (binary) and issueId.
// NULL dates and ids go first, as SQL Server sorts them ascending; the SQL of the Prisma repository mirrors this.
import { ValidationCode } from '@recon/shared'

export interface OrderedIssue {
  issueId: number
  validationCode: string
  cycle: string | null
  missingRange: string | null
  relevantDate: string | null
  transactionIdRaw: string | null
}

const CYCLE_ORDER: Record<string, number> = { E: 0, I: 1, R: 2 }
const RANGE_ORDER: Record<string, number> = { APP: 0, DEC: 1, I: 2, R: 3 }

const nullsFirst = (a: string | null, b: string | null) =>
  a === b ? 0 : a === null ? -1 : b === null ? 1 : a < b ? -1 : 1

export function compareIssueOrder(a: OrderedIssue, b: OrderedIssue): number {
  return (
    ValidationCode.options.indexOf(a.validationCode as ValidationCode) -
      ValidationCode.options.indexOf(b.validationCode as ValidationCode) ||
    (a.cycle === null ? 3 : (CYCLE_ORDER[a.cycle] ?? 3)) - (b.cycle === null ? 3 : (CYCLE_ORDER[b.cycle] ?? 3)) ||
    (a.missingRange === null ? 4 : (RANGE_ORDER[a.missingRange] ?? 4)) -
      (b.missingRange === null ? 4 : (RANGE_ORDER[b.missingRange] ?? 4)) ||
    nullsFirst(a.relevantDate, b.relevantDate) ||
    nullsFirst(a.transactionIdRaw, b.transactionIdRaw) ||
    a.issueId - b.issueId
  )
}
