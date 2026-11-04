// What an edit does to an account (admin-accounts design D3), as pure functions: the normalized cap, the fields that
// really change and the audit action of the edit. Money is normalized to 4 decimals, as DECIMAL(19,4) stores it.
import type { AccountPatch, ChargebackReservePolicy } from '@recon/shared'
import { Prisma } from '../../../generated/prisma/client.js'
import { AccountRuleError } from './errors.js'

/** The editable state of an account, as the API shapes it. */
export interface AccountState {
  name: string
  chargebackReservePolicy: ChargebackReservePolicy
  rollingReserveCapAmt: string | null
  matchingRuleSetId: number | null
  isActive: boolean
}

export type AccountField = keyof AccountState
export type AccountChanges = Partial<{ [F in AccountField]: { before: AccountState[F]; after: AccountState[F] } }>
export type AccountEditAction = 'account.update' | 'account.close' | 'account.reopen'

export interface AccountPatchPlan {
  action: AccountEditAction
  /** Only the fields whose value changes; empty when the body changes nothing. */
  changes: AccountChanges
}

const FIELDS: readonly AccountField[] = [
  'name',
  'chargebackReservePolicy',
  'rollingReserveCapAmt',
  'matchingRuleSetId',
  'isActive',
]

/** The cap as stored (four decimals), or null for no cap; a negative cap is 400 on rollingReserveCapAmt. */
export function normalizeCap(value: string | null): string | null {
  if (value === null) return null
  const amount = new Prisma.Decimal(value)
  if (amount.isNegative()) throw new AccountRuleError('rollingReserveCapAmt', 'The reserve cap cannot be negative')
  return amount.toFixed(4)
}

/**
 * The changes of a PATCH against the stored account. A name that only changes case is a change (it is what the
 * screens and the exports show); the same cap with another scale is not. The action is close or reopen whenever
 * isActive changes, whatever else changes with it.
 */
export function planAccountPatch(current: AccountState, body: Omit<AccountPatch, 'reason'>): AccountPatchPlan {
  const next: AccountState = {
    ...current,
    ...definedOf(body),
    ...('rollingReserveCapAmt' in body && body.rollingReserveCapAmt !== undefined
      ? { rollingReserveCapAmt: normalizeCap(body.rollingReserveCapAmt) }
      : {}),
  }

  const changes: Record<string, { before: unknown; after: unknown }> = {}
  for (const field of FIELDS) {
    if (next[field] !== current[field]) changes[field] = { before: current[field], after: next[field] }
  }

  const action: AccountEditAction =
    changes.isActive === undefined ? 'account.update' : next.isActive ? 'account.reopen' : 'account.close'
  return { action, changes: changes as AccountChanges }
}

/** The fields the body sets; an omitted field keeps its stored value. */
function definedOf(body: Omit<AccountPatch, 'reason'>): Partial<AccountState> {
  return Object.fromEntries(
    Object.entries(body).filter(([key, value]) => value !== undefined && key !== 'reason'),
  ) as Partial<AccountState>
}
