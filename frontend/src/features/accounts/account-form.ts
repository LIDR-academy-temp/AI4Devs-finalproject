// The account forms' values ⇄ the bodies of the API (web-admin-accounts design D5). Pure: the form shows, this
// decides what is sent. Only what changed is sent; the cap is compared and sent as text, never as a JS number.
// The local checks are the ones that would be a sure 400; name uniqueness, the rule set and the fee source are
// decided by the API.
import { canonicalDecimal } from '@/lib/format'
import type { AccountCreateBody, AccountPatchBody, ChargebackReservePolicy } from './contract'
import { strings } from './strings'

/** Every field as the inputs hold it. */
export interface AccountFormValues {
  name: string
  merchantId: string
  providerId: string
  policy: ChargebackReservePolicy
  /** Empty: no cap. */
  cap: string
  /** accountId to copy the active fees from; empty: no fees. */
  copyFrom: string
  /** Empty: global rules only. */
  ruleSetId: string
  reason: string
}

export type AccountFormField = keyof AccountFormValues
export type AccountFormErrors = Partial<Record<AccountFormField, string>>

/** What the edit form needs of an existing account. */
export interface EditableAccount {
  name: string
  chargebackReservePolicy: ChargebackReservePolicy
  rollingReserveCapAmt: string | null
  matchingRuleSetId: number | null
}

type Refused = { ok: false; errors: AccountFormErrors; general: string | null }
export type CreateResult = { ok: true; providerId: number; body: AccountCreateBody } | Refused
export type PatchResult = { ok: true; body: AccountPatchBody } | Refused

const e = strings.form.errors
const MAX_NAME = 50
const MAX_REASON = 500
/** Money ≥ 0 with up to 4 decimals (Money of @recon/shared without the sign: the domain refuses a negative cap). */
const CAP = /^\d{1,15}(\.\d{1,4})?$/

export function initialCreateValues({
  merchantId,
  providerId,
}: {
  merchantId?: number
  providerId?: number
}): AccountFormValues {
  return {
    name: '',
    merchantId: merchantId === undefined ? '' : String(merchantId),
    providerId: providerId === undefined ? '' : String(providerId),
    policy: 'hold_until_term',
    cap: '',
    copyFrom: '',
    ruleSetId: '',
    reason: '',
  }
}

export function initialEditValues(account: EditableAccount): AccountFormValues {
  return {
    name: account.name,
    merchantId: '',
    providerId: '',
    policy: account.chargebackReservePolicy,
    cap: account.rollingReserveCapAmt ?? '',
    copyFrom: '',
    ruleSetId: account.matchingRuleSetId === null ? '' : String(account.matchingRuleSetId),
    reason: '',
  }
}

/** The values the two forms share, trimmed, with their local errors. */
function parse(values: AccountFormValues) {
  const errors: AccountFormErrors = {}
  const name = values.name.trim()
  const cap = values.cap.trim()
  const reason = values.reason.trim()
  if (name === '') errors.name = e.nameRequired
  else if (name.length > MAX_NAME) errors.name = e.nameTooLong
  if (cap !== '' && !CAP.test(cap)) errors.cap = e.capInvalid
  if (reason.length > MAX_REASON) errors.reason = e.reasonTooLong
  return {
    errors,
    name,
    cap: cap === '' ? null : cap,
    ruleSetId: values.ruleSetId === '' ? null : Number.parseInt(values.ruleSetId, 10),
    reason,
  }
}

const hasErrors = (errors: AccountFormErrors) => Object.keys(errors).length > 0

export function createBody(values: AccountFormValues): CreateResult {
  const p = parse(values)
  if (values.providerId === '') p.errors.providerId = e.providerRequired
  if (hasErrors(p.errors)) return { ok: false, errors: p.errors, general: null }
  return {
    ok: true,
    providerId: Number.parseInt(values.providerId, 10),
    body: {
      name: p.name,
      chargebackReservePolicy: values.policy,
      rollingReserveCapAmt: p.cap,
      matchingRuleSetId: p.ruleSetId,
      copyFeesFromAccountId: values.copyFrom === '' ? null : values.copyFrom,
    },
  }
}

/** Only the changed fields, and the reason with them; a change of case only is a change of name, as in the domain. */
export function patchBody(values: AccountFormValues, account: EditableAccount): PatchResult {
  const p = parse(values)
  if (hasErrors(p.errors)) return { ok: false, errors: p.errors, general: null }
  const body: AccountPatchBody = {}
  if (p.name !== account.name) body.name = p.name
  if (values.policy !== account.chargebackReservePolicy) body.chargebackReservePolicy = values.policy
  if (canonicalDecimal(p.cap) !== canonicalDecimal(account.rollingReserveCapAmt)) body.rollingReserveCapAmt = p.cap
  if (p.ruleSetId !== account.matchingRuleSetId) body.matchingRuleSetId = p.ruleSetId
  if (Object.keys(body).length === 0) return { ok: false, errors: {}, general: e.nothingToSave }
  if (p.reason !== '') body.reason = p.reason
  return { ok: true, body }
}
