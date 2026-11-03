import { useQuery } from '@tanstack/react-query'
import { type ReactNode, useEffect, useEffectEvent, useId, useState } from 'react'
import { merchantsQuery, providerQuery, providersQuery } from '@/features/accounts/queries'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import type { FeesSearch } from './fees-search'
import { MAX_Q } from './fees-search'
import { strings } from './strings'

const s = strings.global.filters
const KINDS = ['transactional', 'preset', 'free_amount'] as const
const STATUSES = ['active', 'scheduled', 'closed'] as const
const SEARCH_DEBOUNCE_MS = 300

const controlClass =
  'h-9 min-w-40 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60'

/** A change of filters: the keys that changed, undefined to clear one. */
export type FiltersPatch = Omit<FeesSearch, 'page'>

/**
 * Whether the merchant → provider → account of the address are visible to the user (web-admin-fees design D3). The
 * list is asked only once they are: an id outside the scope would be a 404 of the API, and the screen already knows.
 */
export function useFeeScope(search: FeesSearch) {
  const { merchantId, providerId, accountId } = search
  const merchants = useQuery(merchantsQuery)
  const merchantVisible = merchants.data?.some((m) => m.merchantId === merchantId) ?? false
  const providers = useQuery({ ...providersQuery(merchantId ?? 0), enabled: merchantVisible })
  const providerVisible = merchantVisible && (providers.data?.some((p) => p.providerId === providerId) ?? false)
  const provider = useQuery({ ...providerQuery(providerId ?? 0), enabled: providerVisible })
  const accountVisible = providerVisible && (provider.data?.accounts.some((a) => a.accountId === accountId) ?? false)

  const levels = [
    { asked: merchantId !== undefined, query: merchants, visible: merchantVisible },
    { asked: providerId !== undefined, query: providers, visible: providerVisible },
    { asked: accountId !== undefined, query: provider, visible: accountVisible },
  ]
  let state: 'ready' | 'checking' | 'not_available' | 'error' = 'ready'
  for (const level of levels) {
    if (!level.asked) break
    if (level.query.isError) state = 'error'
    else if (!level.query.data) state = 'checking'
    else if (!level.visible) state = 'not_available'
    if (state !== 'ready') break
  }

  return {
    state,
    merchants: merchants.data ?? [],
    providers: merchantVisible ? (providers.data ?? []) : [],
    accounts: providerVisible ? (provider.data?.accounts ?? []) : [],
    retry: () => Promise.all([merchants, providers, provider].filter((q) => q.isError).map((q) => q.refetch())),
  }
}

export type FeeScope = ReturnType<typeof useFeeScope>

/** Merchant, provider, account, kind, status and search of the global view; each change goes to the address. */
export function FeeFilters({
  search,
  scope,
  onChange,
}: {
  search: FeesSearch
  scope: FeeScope
  onChange: (patch: FiltersPatch) => void
}) {
  const ids = { merchant: useId(), provider: useId(), account: useId(), kind: useId(), status: useId(), q: useId() }
  const [text, setText] = useState(search.q ?? '')
  // Back, Forward or a link change q in the address: the field follows it, unless it already says the same (the
  // address only caught up with what was typed). The debounced text then catches up too, so nothing is written back.
  const [shownQ, setShownQ] = useState(search.q)
  if (search.q !== shownQ) {
    setShownQ(search.q)
    if ((search.q ?? '') !== text.trim()) setText(search.q ?? '')
  }
  const typed = useDebouncedValue(text.trim(), SEARCH_DEBOUNCE_MS)
  const writeQ = useEffectEvent((q: string) => {
    if (q !== (search.q ?? '')) onChange({ q: q || undefined })
  })
  useEffect(() => writeQ(typed), [typed])

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
        {strings.global.notAvailable}
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
        ids.kind,
        s.kind,
        <select
          id={ids.kind}
          className={controlClass}
          value={search.kind ?? ''}
          onChange={(e) => onChange({ kind: (e.target.value || undefined) as FeesSearch['kind'] })}
        >
          <option value="">{s.kinds.all}</option>
          {KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {s.kinds[kind]}
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
          value={search.status ?? 'active'}
          // Active is the default: it leaves the address clean.
          onChange={(e) =>
            onChange({ status: e.target.value === 'active' ? undefined : (e.target.value as FeesSearch['status']) })
          }
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {s.statuses[status]}
            </option>
          ))}
          <option value="all">{s.statuses.all}</option>
        </select>,
      )}
      {field(
        ids.q,
        s.search,
        <input
          id={ids.q}
          type="search"
          className={`${controlClass} min-w-64`}
          placeholder={s.searchPlaceholder}
          maxLength={MAX_Q}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />,
      )}
    </fieldset>
  )
}
