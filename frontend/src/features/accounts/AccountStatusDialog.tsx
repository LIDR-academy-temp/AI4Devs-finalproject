import { useId, useRef, useState } from 'react'
import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { accountProblemOf } from './account-errors'
import { keepOpenWhile } from './account-fields'
import type { AccountDetail } from './contract'
import { useAccountWrite, useRefreshAccount } from './mutations'
import { strings } from './strings'

const f = strings.form
const MAX_REASON = 500

/**
 * Close… / Reopen… (spec accounts "Pantalla Close / Reopen de una cuenta", web-admin-accounts design D7): the pattern
 * of ReasonDialog with the reason optional. The dialog does not close while the request is on its way, and keeps
 * what was written when it fails. It is the content of the AlertDialog of the header, whose Trigger is the action,
 * so the focus goes back to the action when it closes.
 */
export function AccountStatusDialog({ account, onDone }: { account: AccountDetail; onDone: () => void }) {
  const closing = account.isActive
  const [reason, setReason] = useState('')
  const [failure, setFailure] = useState<string | null>(null)
  const write = useAccountWrite()
  const refresh = useRefreshAccount()
  const sending = useRef(false)
  const reasonId = useId()
  const trimmed = reason.trim()

  const confirm = async () => {
    if (sending.current) return
    sending.current = true
    setFailure(null)
    try {
      const isActive = !closing
      await write.mutateAsync({
        kind: 'patch',
        accountId: account.accountId,
        body: trimmed ? { isActive, reason: trimmed } : { isActive },
      })
      onDone()
    } catch (error) {
      const problem = accountProblemOf(error)
      setFailure(Object.values(problem.fields)[0] ?? problem.general)
      if (problem.invalidate) void refresh(problem.invalidate, account)
    } finally {
      sending.current = false
    }
  }

  return (
    <AlertDialogContent {...keepOpenWhile(write.isPending)}>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {closing ? f.status.closeTitle(account.name) : f.status.reopenTitle(account.name)}
        </AlertDialogTitle>
        <AlertDialogDescription>{closing ? f.status.closeBody : f.status.reopenBody}</AlertDialogDescription>
      </AlertDialogHeader>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={reasonId}>{f.labels.reason}</Label>
        <Textarea
          id={reasonId}
          value={reason}
          maxLength={MAX_REASON}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
      {failure && (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      )}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={write.isPending}>{f.cancel}</AlertDialogCancel>
        <Button variant={closing ? 'destructive' : 'default'} onClick={() => void confirm()} disabled={write.isPending}>
          {write.isPending ? f.saving : closing ? f.status.closeConfirm : f.status.reopenConfirm}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}
