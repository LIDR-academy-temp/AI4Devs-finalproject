import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { type ReactNode, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { type AccountChoiceSearch, AccountPicker, useAccountChoice } from '@/features/accounts/account-choice'
import { strings as accountStrings } from '@/features/accounts/strings'
import { ApiError } from '@/lib/api/client'
import type { SettlementListSearch } from './list-search'
import { accountSettlementsQuery } from './queries'
import { isReversed, type ListFilters, SettlementFilters } from './SettlementFilters'
import { SettlementsTable } from './SettlementsTable'
import { strings } from './strings'

const s = strings.list

/** The attempts of the chosen account with the filters and the page of the address. */
function AccountSettlements({
  accountId,
  search,
  onFilters,
  onPage,
}: {
  accountId: string
  search: SettlementListSearch
  onFilters: (next: ListFilters) => void
  onPage: (page: number) => void
}) {
  const filters: ListFilters = { status: search.status, dateField: search.dateField, from: search.from, to: search.to }
  const page = search.page ?? 1
  // A reversed range is not asked for: the API would answer 400, and the field already says why.
  const query = useQuery(accountSettlementsQuery(accountId, { ...filters, page }, !isReversed(filters)))

  let body: ReactNode = null
  if (isReversed(filters)) body = null
  else if (query.isError) {
    body =
      query.error instanceof ApiError && query.error.status === 404 ? (
        <p className="text-sm">{accountStrings.picker.notAvailable}</p>
      ) : (
        <div className="flex items-center gap-3 text-sm">
          <span>{s.loadError}</span>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            {strings.retry}
          </Button>
        </div>
      )
  } else if (query.data) body = <SettlementsTable data={query.data} page={page} onPage={onPage} />
  else body = <Skeleton className="h-40 w-full" aria-label={s.loading} />

  return (
    <div className="flex flex-col gap-4">
      <SettlementFilters filters={filters} onChange={onFilters} />
      {body}
    </div>
  )
}

/**
 * Settlements › Settlement List (README §1.3, settlements-browse D6–D9): merchant → provider → account, closed ones
 * too, then the attempts of the account. Everything the screen shows is in the address.
 */
export function SettlementListPage() {
  const search = useSearch({ from: '/app/settlements' })
  const navigate = useNavigate({ from: '/settlements' })
  // Another account is another list: its filters stay, its page does not. Completing the merchant and provider of
  // a linked account keeps the page.
  const writeChoice = useCallback(
    (next: AccountChoiceSearch, options?: { replace?: boolean }) =>
      void navigate({
        search: (prev: SettlementListSearch) => ({
          ...prev,
          ...next,
          page: next.accountId === prev.accountId ? prev.page : undefined,
        }),
        replace: options?.replace,
      }),
    [navigate],
  )
  const choice = useAccountChoice({ search, navigate: writeChoice, includeClosed: true })

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{s.title}</h1>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <AccountPicker choice={choice} />
          {!choice.account && !choice.notAvailable && (
            <p className="text-sm text-muted-foreground">{s.chooseAccount}</p>
          )}
          {choice.account && (
            <AccountSettlements
              accountId={choice.account.accountId}
              search={search}
              // A new filter is a new list: back to its first page.
              onFilters={(next) =>
                void navigate({ search: (prev: SettlementListSearch) => ({ ...prev, ...next, page: undefined }) })
              }
              onPage={(page) =>
                void navigate({
                  search: (prev: SettlementListSearch) => ({ ...prev, page: page > 1 ? page : undefined }),
                })
              }
            />
          )}
        </CardContent>
      </Card>
    </section>
  )
}
