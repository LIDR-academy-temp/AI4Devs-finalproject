import { type ReactNode, useId } from 'react'
import type { ScopeSelection } from '@/features/accounts/scope-selection'
import { strings } from '../strings'
import { type InProgressSearch, OPEN_STATUSES } from '../validate-search'

const s = strings.inProgress.filters

const controlClass =
  'h-9 min-w-40 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60'

/** A change of filters: the keys that changed, undefined to clear one. */
export type InProgressFiltersPatch = Omit<InProgressSearch, 'page'>

/**
 * Merchant, provider, account, status and Only mine of In Progress (spec "Pantalla In Progress: filtros"); each
 * change goes to the address. A level of the cascade clears the ones below it.
 */
export function InProgressFilters({
  search,
  scope,
  onChange,
}: {
  search: InProgressSearch
  scope: ScopeSelection
  onChange: (patch: InProgressFiltersPatch) => void
}) {
  const ids = { merchant: useId(), provider: useId(), account: useId(), status: useId(), mine: useId() }
  const toId = (value: string) => (value === '' ? undefined : Number(value))
  const field = (id: string, label: string, control: ReactNode) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {control}
    </div>
  )
  /** An id of the address the lists do not have: kept selected, so choosing anything else is a change. */
  const unknown = (value: number | string | undefined, known: boolean) =>
    value !== undefined && !known ? (
      <option value={String(value)} hidden>
        {strings.inProgress.notAvailable}
      </option>
    ) : null

  const merchantKnown = scope.merchants.some((m) => m.merchantId === search.merchantId)
  const providerKnown = scope.providers.some((p) => p.providerId === search.providerId)
  const accountKnown = scope.accounts.some((a) => a.accountId === search.accountId)

  return (
    <fieldset className="flex flex-wrap items-end gap-4">
      <legend className="sr-only">{s.label}</legend>
      {field(
        ids.merchant,
        s.merchant,
        <select
          id={ids.merchant}
          className={controlClass}
          value={search.merchantId === undefined ? '' : String(search.merchantId)}
          onChange={(e) => onChange({ merchantId: toId(e.target.value), providerId: undefined, accountId: undefined })}
        >
          <option value="">{s.allMerchants}</option>
          {unknown(search.merchantId, merchantKnown)}
          {scope.merchants.map((m) => (
            <option key={m.merchantId} value={m.merchantId}>
              {m.name}
            </option>
          ))}
        </select>,
      )}
      {field(
        ids.provider,
        s.provider,
        <select
          id={ids.provider}
          className={controlClass}
          value={search.providerId === undefined ? '' : String(search.providerId)}
          disabled={!merchantKnown}
          onChange={(e) => onChange({ providerId: toId(e.target.value), accountId: undefined })}
        >
          <option value="">{s.allProviders}</option>
          {unknown(search.providerId, providerKnown)}
          {scope.providers.map((p) => (
            <option key={p.providerId} value={p.providerId}>
              {p.name}
            </option>
          ))}
        </select>,
      )}
      {field(
        ids.account,
        s.account,
        <select
          id={ids.account}
          className={controlClass}
          value={search.accountId ?? ''}
          disabled={!providerKnown}
          onChange={(e) => onChange({ accountId: e.target.value || undefined })}
        >
          <option value="">{s.allAccounts}</option>
          {unknown(search.accountId, accountKnown)}
          {scope.accounts.map((a) => (
            <option key={a.accountId} value={a.accountId}>
              {a.isActive ? a.name : s.closedAccount(a.name)}
            </option>
          ))}
        </select>,
      )}
      {field(
        ids.status,
        s.status,
        <select
          id={ids.status}
          className={controlClass}
          value={search.status ?? ''}
          onChange={(e) => onChange({ status: OPEN_STATUSES.find((status) => status === e.target.value) })}
        >
          <option value="">{s.anyStatus}</option>
          {OPEN_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>,
      )}
      <div className="flex h-9 items-center gap-2">
        <input
          id={ids.mine}
          type="checkbox"
          className="size-4"
          checked={search.mine === true}
          onChange={(e) => onChange({ mine: e.target.checked ? true : undefined })}
        />
        <label htmlFor={ids.mine} className="text-sm font-medium">
          {s.mine}
        </label>
      </div>
    </fieldset>
  )
}
