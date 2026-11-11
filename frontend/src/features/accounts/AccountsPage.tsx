import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import { NewAccountDialog } from './NewAccountDialog'
import { ProviderAccounts } from './ProviderAccounts'
import { useCanManageAccounts } from './permissions'
import {
  ProviderChoiceFields,
  type ProviderChoiceSearch,
  useProviderChoice,
  validateProviderChoiceSearch,
} from './provider-choice'
import { strings } from './strings'

export type AccountsSearch = ProviderChoiceSearch

export const validateAccountsSearch = validateProviderChoiceSearch

/** Administration › Accounts: merchant → provider → accounts with their channels (openspec/specs/accounts). */
export function AccountsPage() {
  const search = useSearch({ from: '/app/accounts' })
  const navigate = useNavigate({ from: '/accounts' })
  const canManage = useCanManageAccounts()
  const [creating, setCreating] = useState(false)
  const choice = useProviderChoice({
    search,
    navigate: useCallback(
      (next: AccountsSearch, options: { replace?: boolean; resetScroll?: boolean }) =>
        void navigate({ search: next, ...options }),
      [navigate],
    ),
  })

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{strings.title}</h1>
        {canManage && (
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger asChild>
              <Button size="sm">{strings.form.newAccount}</Button>
            </DialogTrigger>
            {creating && <NewAccountDialog merchantId={choice.merchantId} providerId={choice.providerId} />}
          </Dialog>
        )}
      </div>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <ProviderChoiceFields choice={choice} />
          {choice.notAvailable ? (
            <p className="text-sm">{strings.notAvailable}</p>
          ) : choice.providerId !== undefined ? (
            <ProviderAccounts key={choice.providerId} providerId={choice.providerId} />
          ) : (
            <p className="text-sm text-muted-foreground">{strings.chooseHint}</p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
