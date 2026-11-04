// The pieces New account and Edit share (web-admin-accounts design D5–D7): a labelled field with its error, the
// policy and rule set choices, and where the focus goes after a refused submit.
import { type ReactNode, useEffect, useRef, useState } from 'react'
import type { UseFormSetFocus } from 'react-hook-form'
import type { AccountFormErrors, AccountFormField, AccountFormValues } from './account-form'
import type { ChargebackReservePolicy, MatchingRuleSet } from './contract'
import { strings } from './strings'

const f = strings.form

export const controlClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-destructive'

export const POLICIES: ChargebackReservePolicy[] = ['hold_until_term', 'release_on_chargeback']

/** The fields in the order the forms show them: a refused submit puts the focus on the first one with an error. */
const FIELD_ORDER: AccountFormField[] = [
  'name',
  'merchantId',
  'providerId',
  'policy',
  'cap',
  'copyFrom',
  'ruleSetId',
  'reason',
]

/**
 * The forms are the content of a Root their page owns, with the action as its Trigger, so closing gives the focus
 * back to the action. While a request is on its way, Escape and a click outside do not close them: there would be
 * nowhere to say that it failed.
 */
export function keepOpenWhile(pending: boolean) {
  const keep = (event: Event) => {
    if (pending) event.preventDefault()
  }
  return { onEscapeKeyDown: keep, onInteractOutside: keep }
}

export interface Shown {
  fields: AccountFormErrors
  general: string | null
}

export const NOTHING: Shown = { fields: {}, general: null }

/**
 * What a form shows of a refused submit, with the focus on the first field with an error (the general message
 * takes the focus by itself when it appears, see GeneralMessage).
 */
export function useShown(setFocus: UseFormSetFocus<AccountFormValues>) {
  const [shown, setShown] = useState<Shown>(NOTHING)
  const show = (next: Shown) => {
    setShown(next)
    const first = FIELD_ORDER.find((field) => next.fields[field])
    if (first) setFocus(first)
  }
  return { shown, show, clear: () => setShown(NOTHING) }
}

/** aria-invalid and aria-describedby of a field with an error. */
export function invalidProps(shown: Shown, field: AccountFormField, id: string) {
  return {
    'aria-invalid': shown.fields[field] ? true : undefined,
    'aria-describedby': shown.fields[field] ? `${id}-error` : undefined,
  }
}

export function Field({
  id,
  label,
  error,
  help,
  children,
}: {
  id: string
  label: string
  error?: string
  help?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/** The message of the form as a whole; it takes the focus when it appears or changes. */
export function GeneralMessage({ message }: { message: string | null }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (message) ref.current?.focus()
  }, [message])
  if (!message) return null
  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="rounded-md border border-destructive/40 p-2 text-sm text-destructive focus-visible:outline-none"
    >
      {message}
    </div>
  )
}

/**
 * The rule sets a form offers: the active ones of the provider and, in Edit, the current one although it is
 * inactive (saving something else must not change it). While the sets load, the current one is offered by its id,
 * so the choice is never lost.
 */
export function ruleSetOptions(sets: MatchingRuleSet[] | undefined, current: number | null) {
  const active = (sets ?? []).filter((s) => s.isActive).map((s) => ({ value: String(s.ruleSetId), label: s.name }))
  if (current === null || active.some((o) => o.value === String(current))) return active
  const known = sets?.find((s) => s.ruleSetId === current)
  const label = known ? f.inactiveRuleSet(known.name) : strings.detail.general.ruleSet(current)
  return [...active, { value: String(current), label }]
}
