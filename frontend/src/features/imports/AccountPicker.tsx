import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { type ReactNode, useEffect, useId } from 'react'
import { accountQuery, merchantsQuery, providerQuery, providersQuery } from '@/features/accounts/queries'
import { strings } from './strings'
import type { NewReconciliationSearch } from './validate-search'

const selectClass =
  'h-9 min-w-56 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'

/**
 * Merchant → provider → active account of the scope (spec "Pantalla Upload Files: elección de la cuenta").
 * A single possible value is preselected and every choice goes to the address. Returns the chosen account.
 */
export function useAccountChoice() {
  const search = useSearch({ from: '/app/reconciliations/new' })
  const navigate = useNavigate({ from: '/reconciliations/new' })

  // An account given alone (a link from an import) brings its merchant and provider.
  const linked = useQuery({
    ...accountQuery(search.accountId ?? ''),
    enabled: search.accountId !== undefined && (search.merchantId === undefined || search.providerId === undefined),
  })

  const merchants = useQuery(merchantsQuery)
  const merchantId =
    search.merchantId ??
    linked.data?.merchant.merchantId ??
    (merchants.data?.length === 1 && search.accountId === undefined ? merchants.data[0]?.merchantId : undefined)
  const merchantVisible = merchants.data?.some((m) => m.merchantId === merchantId) ?? false

  const providers = useQuery({ ...providersQuery(merchantId ?? 0), enabled: merchantVisible })
  const providerList = merchantVisible ? (providers.data ?? []) : []
  const providerId =
    search.providerId ??
    linked.data?.providerId ??
    (providerList.length === 1 && search.accountId === undefined ? providerList[0]?.providerId : undefined)
  const providerVisible = providerList.some((p) => p.providerId === providerId)

  const provider = useQuery({ ...providerQuery(providerId ?? 0), enabled: providerVisible })
  const accountList = providerVisible ? (provider.data?.accounts.filter((a) => a.isActive) ?? []) : []
  const accountId = search.accountId ?? (accountList.length === 1 ? accountList[0]?.accountId : undefined)
  const account = accountList.find((a) => a.accountId === accountId)

  const notAvailable =
    linked.isError ||
    (merchants.isSuccess && merchantId !== undefined && !merchantVisible) ||
    (providers.isSuccess && merchantVisible && providerId !== undefined && !providerVisible) ||
    (provider.isSuccess && providerVisible && accountId !== undefined && !account)

  useEffect(() => {
    const auto = {
      merchantId: search.merchantId === undefined && merchantVisible ? merchantId : undefined,
      providerId: search.providerId === undefined && providerVisible ? providerId : undefined,
      accountId: search.accountId === undefined && account ? account.accountId : undefined,
    }
    if (auto.merchantId === undefined && auto.providerId === undefined && auto.accountId === undefined) return
    void navigate({
      search: (prev: NewReconciliationSearch) => ({
        merchantId: auto.merchantId ?? prev.merchantId,
        providerId: auto.providerId ?? prev.providerId,
        accountId: auto.accountId ?? prev.accountId,
      }),
      replace: true,
    })
  }, [search, merchantVisible, providerVisible, merchantId, providerId, account, navigate])

  return {
    merchants: merchants.data ?? [],
    providers: providerList,
    accounts: accountList,
    merchantId: merchantVisible ? merchantId : undefined,
    providerId: providerVisible ? providerId : undefined,
    account,
    notAvailable,
    chooseMerchant: (value: string) =>
      navigate({
        search: { merchantId: value ? Number(value) : undefined, providerId: undefined, accountId: undefined },
      }),
    chooseProvider: (value: string) =>
      navigate({
        search: (prev: NewReconciliationSearch) => ({
          merchantId: prev.merchantId ?? merchantId,
          providerId: value ? Number(value) : undefined,
          accountId: undefined,
        }),
      }),
    chooseAccount: (value: string) =>
      navigate({
        search: (prev: NewReconciliationSearch) => ({
          merchantId: prev.merchantId ?? merchantId,
          providerId: prev.providerId ?? providerId,
          accountId: value || undefined,
        }),
      }),
  }
}

export type AccountChoice = ReturnType<typeof useAccountChoice>

export function AccountPicker({ choice, disabled = false }: { choice: AccountChoice; disabled?: boolean }) {
  const merchantSelectId = useId()
  const providerSelectId = useId()
  const accountSelectId = useId()
  const field = (id: string, label: string, control: ReactNode) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {control}
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4">
        {field(
          merchantSelectId,
          strings.picker.merchant,
          <select
            id={merchantSelectId}
            className={selectClass}
            value={choice.merchantId === undefined ? '' : String(choice.merchantId)}
            disabled={disabled}
            onChange={(event) => choice.chooseMerchant(event.target.value)}
          >
            <option value="">{strings.picker.chooseMerchant}</option>
            {choice.merchants.map((m) => (
              <option key={m.merchantId} value={m.merchantId}>
                {m.name}
              </option>
            ))}
          </select>,
        )}
        {field(
          providerSelectId,
          strings.picker.provider,
          <select
            id={providerSelectId}
            className={selectClass}
            value={choice.providerId === undefined ? '' : String(choice.providerId)}
            disabled={disabled || choice.merchantId === undefined}
            onChange={(event) => choice.chooseProvider(event.target.value)}
          >
            <option value="">{strings.picker.chooseProvider}</option>
            {choice.providers.map((p) => (
              <option key={p.providerId} value={p.providerId}>
                {p.name}
              </option>
            ))}
          </select>,
        )}
        {field(
          accountSelectId,
          strings.picker.account,
          <select
            id={accountSelectId}
            className={selectClass}
            value={choice.account?.accountId ?? ''}
            disabled={disabled || choice.providerId === undefined}
            onChange={(event) => choice.chooseAccount(event.target.value)}
          >
            <option value="">{strings.picker.chooseAccount}</option>
            {choice.accounts.map((a) => (
              <option key={a.accountId} value={a.accountId}>
                {a.name}
              </option>
            ))}
          </select>,
        )}
      </div>
      {choice.notAvailable && <p className="text-sm">{strings.picker.notAvailable}</p>}
    </div>
  )
}
