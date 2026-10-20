import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { type AccountChoiceSearch, AccountPicker, useAccountChoice } from '@/features/accounts/account-choice'
import type { SettlementListSearch } from './list-search'
import { strings } from './strings'

const s = strings.list

/**
 * Settlements › Settlement List (README §1.3, settlements-browse D6–D9): merchant → provider → account, closed ones
 * too, then the attempts of the account. Everything the screen shows is in the address.
 */
export function SettlementListPage() {
  const search = useSearch({ from: '/app/settlements' })
  const navigate = useNavigate({ from: '/settlements' })
  // Another account is another list: its filters stay, its page does not.
  const writeChoice = useCallback(
    (next: AccountChoiceSearch, options?: { replace?: boolean }) =>
      void navigate({
        search: (prev: SettlementListSearch) => ({ ...prev, ...next, page: undefined }),
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
        </CardContent>
      </Card>
    </section>
  )
}
