// Merchant → provider of the scope, both in the address (spec accounts "Pantalla Accounts", web-admin-matching
// design D1). Shared by Accounts and Matching Rules: a single possible value is preselected and goes to the address
// too, and a merchant or provider outside the scope is reported instead of shown.
import { useQuery } from '@tanstack/react-query'
import { useEffect, useId } from 'react'
import { merchantsQuery, providersQuery } from './queries'
import { strings } from './strings'

export interface ProviderChoiceSearch {
  merchantId?: number
  providerId?: number
}

const toId = (value: unknown): number | undefined => {
  const id = typeof value === 'string' && /^\d{1,10}$/.test(value) ? Number(value) : value
  return typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : undefined
}

export const validateProviderChoiceSearch = (search: Record<string, unknown>): ProviderChoiceSearch => ({
  merchantId: toId(search.merchantId),
  providerId: toId(search.providerId),
})

export interface ProviderChoiceOptions {
  /** The choices in the address of the screen. */
  search: ProviderChoiceSearch
  /** Writes both choices to the address. Stable. */
  navigate: (choice: ProviderChoiceSearch, options: { replace?: boolean; resetScroll?: boolean }) => void
}

export function useProviderChoice({ search, navigate }: ProviderChoiceOptions) {
  const merchants = useQuery(merchantsQuery)
  const merchantId = search.merchantId ?? (merchants.data?.length === 1 ? merchants.data[0]?.merchantId : undefined)
  const merchantVisible = merchants.data?.some((m) => m.merchantId === merchantId) ?? false

  const providers = useQuery({ ...providersQuery(merchantId ?? 0), enabled: merchantVisible })
  const providerList = merchantVisible ? (providers.data ?? []) : []
  const providerId = search.providerId ?? (providerList.length === 1 ? providerList[0]?.providerId : undefined)
  const providerVisible = providerList.some((p) => p.providerId === providerId)

  const notAvailable =
    (merchants.isSuccess && merchantId !== undefined && !merchantVisible) ||
    (providers.isSuccess && merchantVisible && providerId !== undefined && !providerVisible)

  // A preselected merchant or provider goes to the address too, so reloading or sharing shows the same.
  useEffect(() => {
    const autoMerchant = search.merchantId === undefined && merchantVisible
    const autoProvider = search.providerId === undefined && providerVisible
    if (autoMerchant || autoProvider) {
      navigate(
        {
          merchantId: autoMerchant ? merchantId : search.merchantId,
          providerId: autoProvider ? providerId : search.providerId,
        },
        { replace: true },
      )
    }
  }, [search.merchantId, search.providerId, merchantVisible, providerVisible, merchantId, providerId, navigate])

  return {
    merchants: merchants.data ?? [],
    merchantId: merchantVisible ? merchantId : undefined,
    providers: providerList,
    providerId: providerVisible ? providerId : undefined,
    notAvailable,
    // Choosing in place: the page stays where it is and the drop-down keeps the focus (ui-polish design D13).
    chooseMerchant: (value: string) =>
      navigate({ merchantId: toId(value), providerId: undefined }, { resetScroll: false }),
    chooseProvider: (value: string) =>
      navigate({ merchantId: search.merchantId, providerId: toId(value) }, { resetScroll: false }),
  }
}

export type ProviderChoice = ReturnType<typeof useProviderChoice>

const selectClass =
  'h-9 min-w-56 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** The two drop-downs of a provider choice. */
export function ProviderChoiceFields({ choice }: { choice: ProviderChoice }) {
  const merchantSelectId = useId()
  const providerSelectId = useId()
  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={merchantSelectId} className="text-sm font-medium">
          {strings.merchant}
        </label>
        <select
          id={merchantSelectId}
          className={selectClass}
          value={choice.merchantId === undefined ? '' : String(choice.merchantId)}
          onChange={(event) => choice.chooseMerchant(event.target.value)}
        >
          <option value="">{strings.chooseMerchant}</option>
          {choice.merchants.map((m) => (
            <option key={m.merchantId} value={m.merchantId}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={providerSelectId} className="text-sm font-medium">
          {strings.provider}
        </label>
        <select
          id={providerSelectId}
          className={selectClass}
          value={choice.providerId === undefined ? '' : String(choice.providerId)}
          disabled={choice.merchantId === undefined}
          onChange={(event) => choice.chooseProvider(event.target.value)}
        >
          <option value="">{strings.chooseProvider}</option>
          {choice.providers.map((p) => (
            <option key={p.providerId} value={p.providerId}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
