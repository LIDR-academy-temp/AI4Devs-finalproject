import { type AccountRef, type MatchingRuleSetDetail, RuleSetInUseDetails } from '@recon/shared'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
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
import { keepOpenWhile } from '@/features/accounts/account-fields'
import { ApiError } from '@/lib/api/client'
import { usePutRuleSet } from './mutations'
import { ruleSetKey } from './queries'
import { ruleProblemOf } from './rule-errors'
import { ruleSetBody } from './rule-form'
import { strings } from './strings'

const st = strings.status
const NAME_ONLY = { sheetRules: 0, columnRules: 0, statusAliases: 0, name: true }

/** The accounts of a 409 rule_set_in_use, or none when its details do not parse (the text is shown anyway). */
function accountsInUse(error: unknown): AccountRef[] | null {
  if (!(error instanceof ApiError) || error.status !== 409 || error.code !== 'rule_set_in_use') return null
  const parsed = RuleSetInUseDetails.safeParse(error.details)
  return parsed.success ? parsed.data.accounts : []
}

/**
 * Deactivate… / Activate… (spec matching "Pantalla Matching Rules: activar y desactivar", design D7): the whole
 * document with isActive changed and the rules as they are saved. A set in use stays as it is and the dialog lists
 * its accounts, each a link to its page. It is the content of the AlertDialog of the header, whose Trigger is the
 * action, so the focus goes back to the action when it closes.
 */
export function RuleSetStatusDialog({ ruleSet, onDone }: { ruleSet: MatchingRuleSetDetail; onDone: () => void }) {
  const deactivating = ruleSet.isActive
  const [reason, setReason] = useState('')
  const [failure, setFailure] = useState<string | null>(null)
  const [inUse, setInUse] = useState<AccountRef[] | null>(null)
  const put = usePutRuleSet(String(ruleSet.ruleSetId))
  const queryClient = useQueryClient()
  const sending = useRef(false)
  const reasonId = useId()

  const confirm = async () => {
    if (sending.current) return
    sending.current = true
    setFailure(null)
    setInUse(null)
    try {
      await put.mutateAsync(ruleSetBody(ruleSet, { isActive: !deactivating, reason }))
      onDone()
    } catch (error) {
      const accounts = accountsInUse(error)
      if (accounts) {
        setInUse(accounts)
        return
      }
      const problem = ruleProblemOf(error, NAME_ONLY)
      if (problem.invalidate) void queryClient.invalidateQueries({ queryKey: ruleSetKey(ruleSet.ruleSetId) })
      setFailure(Object.values(problem.fields)[0] ?? problem.general)
    } finally {
      sending.current = false
    }
  }

  return (
    <AlertDialogContent {...keepOpenWhile(put.isPending)}>
      <AlertDialogHeader>
        <AlertDialogTitle className="[overflow-wrap:anywhere]">
          {deactivating ? st.deactivateTitle(ruleSet.name) : st.activateTitle(ruleSet.name)}
        </AlertDialogTitle>
        <AlertDialogDescription>{deactivating ? st.deactivateBody : st.activateBody}</AlertDialogDescription>
      </AlertDialogHeader>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={reasonId}>{strings.form.reason}</Label>
        <Textarea id={reasonId} value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} />
      </div>
      {inUse && (
        <div role="alert" className="flex flex-col gap-2 text-sm text-destructive">
          <p>{st.inUse}</p>
          {inUse.length > 0 && (
            <ul className="flex flex-col gap-1">
              {inUse.map((account) => (
                <li key={account.accountId} className="[overflow-wrap:anywhere]">
                  <Link
                    to="/accounts/$accountId"
                    params={{ accountId: account.accountId }}
                    className="text-primary underline underline-offset-4"
                  >
                    {account.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {failure && (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      )}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={put.isPending}>{strings.form.cancel}</AlertDialogCancel>
        <Button
          variant={deactivating ? 'destructive' : 'default'}
          onClick={() => void confirm()}
          disabled={put.isPending}
        >
          {put.isPending ? strings.form.saving : deactivating ? st.deactivate : st.activate}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}
