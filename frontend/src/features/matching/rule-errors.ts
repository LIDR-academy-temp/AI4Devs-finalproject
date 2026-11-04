// A failed write of matching rules → what the form shows (web-admin-matching design D6). The form never closes on an
// error and keeps its values and order; this only says where each message goes. The message of a domain 400 is the
// API's own (it names the rule that failed), shown next to that field of that row.
import { ApiError } from '@/lib/api/client'
import { strings } from './strings'

const e = strings.form.errors

export interface RuleProblem {
  /** Messages next to a field, keyed by the path of details.field (`sheetRules[2].statusId`, `name`). */
  fields: Record<string, string>
  /** Message of the form as a whole. */
  general: string | null
  /** The rule set shown is gone or out of the scope: its detail must be read again. */
  invalidate: 'detail' | null
}

/** How many rows of each list the form has, and whether it has a name field. */
export interface RuleFormShape {
  sheetRules: number
  columnRules: number
  statusAliases: number
  name: boolean
  /** details.field paths of fields the form does not show for the kind of their sheet: their 400 is general. */
  hidden?: ReadonlySet<string>
}

const FIELDS: Record<'sheetRules' | 'columnRules' | 'statusAliases', readonly string[]> = {
  sheetRules: ['sheetPattern', 'isRegex', 'kind', 'cycle', 'statusId', 'priority', 'isActive'],
  columnRules: ['sheetPattern', 'columnPattern', 'isRegex', 'targetField', 'priority', 'isActive'],
  statusAliases: ['alias', 'statusId', 'excludeAmount', 'isLegacy'],
}

const ROW_PATH = /^(sheetRules|columnRules|statusAliases)\[(\d+)\]\.(\w+)$/

/** Whether details.field names a field the form shows. */
function inForm(field: string, shape: RuleFormShape): boolean {
  if (field === 'name') return shape.name
  const match = ROW_PATH.exec(field)
  if (!match || shape.hidden?.has(field)) return false
  const list = match[1] as keyof typeof FIELDS
  return Number(match[2]) < shape[list] && FIELDS[list].includes(match[3] ?? '')
}

/** details.field → the path of the same field in react-hook-form (`sheetRules.2.statusId`). */
export const formPath = (field: string) => field.replace(/\[(\d+)\]/g, '.$1')

function domainField(details: unknown): string | undefined {
  if (!details || typeof details !== 'object' || Array.isArray(details) || !('field' in details)) return undefined
  return typeof details.field === 'string' ? details.field : undefined
}

const problem = (patch: Partial<RuleProblem>): RuleProblem => ({
  fields: {},
  general: null,
  invalidate: null,
  ...patch,
})

export function ruleProblemOf(error: unknown, shape: RuleFormShape): RuleProblem {
  // No answer at all: fetch failed before reaching the server.
  if (!(error instanceof ApiError)) return problem({ general: e.unreachable })
  if (error.status === 409 && error.code === 'rule_set_name_taken') {
    // Edit mode has no name field: the message is the form's.
    return shape.name ? problem({ fields: { name: e.nameTaken } }) : problem({ general: e.nameTaken })
  }
  if (error.status === 400) {
    const field = domainField(error.details)
    return field && inForm(field, shape)
      ? problem({ fields: { [field]: error.message } })
      : problem({ general: e.invalid })
  }
  if (error.status === 403) return problem({ general: e.forbidden })
  if (error.status === 404) return problem({ general: e.notFound, invalidate: 'detail' })
  // The server answered (5xx or anything else): it was reached, the write failed.
  return problem({ general: e.saveFailed })
}
