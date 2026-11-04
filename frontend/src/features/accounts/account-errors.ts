// A failed write of an account → what its form shows (web-admin-accounts design D6). The form never closes on an
// error and keeps what was written; this only says where the message goes and what to ask for again.
import { ApiError } from '@/lib/api/client'
import type { AccountFormErrors, AccountFormField } from './account-form'
import { strings } from './strings'

const e = strings.form.errors

export interface AccountProblem {
  /** Messages next to a field. */
  fields: AccountFormErrors
  /** Message of the form as a whole. */
  general: string | null
  /** What the screen shows is stale: the rule sets of the provider, or the account and its provider. */
  invalidate: 'ruleSets' | 'account' | null
}

/** details.field of a domain 400 → the field of the form and its message. */
const DOMAIN_FIELDS: Record<string, [AccountFormField, string]> = {
  copyFeesFromAccountId: ['copyFrom', e.copyFromInvalid],
  matchingRuleSetId: ['ruleSetId', e.ruleSetInvalid],
  rollingReserveCapAmt: ['cap', e.capInvalid],
}

const problem = (patch: Partial<AccountProblem>): AccountProblem => ({
  fields: {},
  general: null,
  invalidate: null,
  ...patch,
})

function domainField(details: unknown): string | undefined {
  if (!details || typeof details !== 'object' || Array.isArray(details) || !('field' in details)) return undefined
  return typeof details.field === 'string' ? details.field : undefined
}

export function accountProblemOf(error: unknown): AccountProblem {
  if (!(error instanceof ApiError)) return problem({ general: e.unreachable })
  if (error.status === 409 && error.code === 'account_name_taken') return problem({ fields: { name: e.nameTaken } })
  if (error.status === 400) {
    const known = DOMAIN_FIELDS[domainField(error.details) ?? '']
    if (!known) return problem({ general: e.invalid })
    const [field, message] = known
    return problem({ fields: { [field]: message }, invalidate: field === 'ruleSetId' ? 'ruleSets' : null })
  }
  if (error.status === 403) return problem({ general: e.forbidden })
  if (error.status === 404) return problem({ general: e.notFound, invalidate: 'account' })
  return problem({ general: e.unreachable })
}
