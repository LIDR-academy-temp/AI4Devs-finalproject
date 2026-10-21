import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useId } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ProviderAccounts } from './ProviderAccounts'
import { merchantsQuery, providersQuery } from './queries'
import { strings } from './strings'

export interface AccountsSearch {
  merchantId?: number
  providerId?: number
}

const toId = (value: unknown): number | undefined => {
  const id = typeof value === 'string' && /^\d{1,10}$/.test(value) ? Number(value) : value
  return typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : undefined
}

export const validateAccountsSearch = (search: Record<string, unknown>): AccountsSearch => ({
  merchantId: toId(search.merchantId),
  providerId: toId(search.providerId),
})

const selectClass =
  'h-9 min-w-56 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Administration › Accounts: merchant → provider → accounts with their channels (openspec/specs/accounts). */
export function AccountsPage() {
  const search = useSearch({ from: '/app/accounts' })
  const navigate = useNavigate({ from: '/accounts' })
  const merchantSelectId = useId()
  const providerSelectId = useId()

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
      void navigate({
        search: (prev: AccountsSearch) => ({
          ...prev,
          merchantId: autoMerchant ? merchantId : prev.merchantId,
          providerId: autoProvider ? providerId : prev.providerId,
        }),
        replace: true,
      })
    }
  }, [search.merchantId, search.providerId, merchantVisible, providerVisible, merchantId, providerId, navigate])

  // Choosing in place: the page stays where it is and the drop-down keeps the focus (ui-polish design D13).
  const chooseMerchant = (value: string) =>
    navigate({ search: { merchantId: toId(value), providerId: undefined }, resetScroll: false })
  const chooseProvider = (value: string) =>
    navigate({ search: (prev: AccountsSearch) => ({ ...prev, providerId: toId(value) }), resetScroll: false })

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{strings.title}</h1>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={merchantSelectId} className="text-sm font-medium">
                {strings.merchant}
              </label>
              <select
                id={merchantSelectId}
                className={selectClass}
                value={merchantVisible ? String(merchantId) : ''}
                onChange={(event) => chooseMerchant(event.target.value)}
              >
                <option value="">{strings.chooseMerchant}</option>
                {merchants.data?.map((m) => (
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
                value={providerVisible ? String(providerId) : ''}
                disabled={!merchantVisible}
                onChange={(event) => chooseProvider(event.target.value)}
              >
                <option value="">{strings.chooseProvider}</option>
                {providerList.map((p) => (
                  <option key={p.providerId} value={p.providerId}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {notAvailable ? (
            <p className="text-sm">{strings.notAvailable}</p>
          ) : providerVisible && providerId !== undefined ? (
            <ProviderAccounts key={providerId} providerId={providerId} />
          ) : (
            <p className="text-sm text-muted-foreground">{strings.chooseHint}</p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
