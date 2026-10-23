import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { type AccountChoiceSearch, AccountPicker, useAccountChoice } from '@/features/accounts/account-choice'
import { DropZone } from './files/DropZone'
import { FileList } from './files/FileList'
import { useQueueSnapshot, useUploadQueue } from './files/UploadQueueProvider'
import { strings } from './strings'

/**
 * Reconciliation › New Reconciliation: the account and the files of a new import (README §1.3, HU1). The first
 * file the API accepts creates the import and the app moves to it (design D4).
 */
export function NewReconciliationPage() {
  const search = useSearch({ from: '/app/reconciliations/new' })
  const navigate = useNavigate({ from: '/reconciliations/new' })
  // The address of this screen is the choice alone.
  const writeChoice = useCallback(
    (next: AccountChoiceSearch, options?: { replace?: boolean }) =>
      // Choosing in place: the page stays where it is (ui-polish design D13).
      void navigate({ search: next, replace: options?.replace, resetScroll: false }),
    [navigate],
  )
  const choice = useAccountChoice({ search, navigate: writeChoice, includeClosed: false })
  const account = choice.account
  const queue = useUploadQueue()
  useQueueSnapshot(queue)
  const batch = account ? queue.forAccount(account.accountId) : undefined
  const uploading = batch?.entries.some((e) => e.state !== 'rejected') ?? false

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{strings.newTitle}</h1>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <AccountPicker choice={choice} disabled={uploading} />
          {batch && batch.entries.length > 0 && <FileList files={[]} entries={batch.entries} />}
          {batch?.selectionError && <p className="text-sm text-destructive">{batch.selectionError}</p>}
          <DropZone
            disabled={!account || uploading}
            hint={account ? strings.upload.hint : strings.upload.chooseAccount}
            onFiles={(files) => account && queue.enqueue({ accountId: account.accountId }, files)}
          />
        </CardContent>
      </Card>
    </section>
  )
}
