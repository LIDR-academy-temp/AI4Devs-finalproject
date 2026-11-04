import { useQuery } from '@tanstack/react-query'
import { useId, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { accountProblemOf } from './account-errors'
import {
  controlClass,
  Field,
  GeneralMessage,
  invalidProps,
  keepOpenWhile,
  POLICIES,
  ruleSetOptions,
  useShown,
} from './account-fields'
import { type AccountFormValues, initialEditValues, patchBody } from './account-form'
import type { AccountDetail } from './contract'
import { useAccountWrite, useRefreshAccount } from './mutations'
import { matchingRuleSetsQuery } from './queries'
import { strings } from './strings'

const f = strings.form

/**
 * Edit (spec accounts "Pantalla Edit account", web-admin-accounts design D7): a side panel so the Overview stays in
 * view. Only the changed fields are sent, the cap compared as text; the panel keeps what was written after any
 * error and closes when the API accepted the write. It is the content of the Sheet of the header, whose Trigger is
 * Edit.
 */
export function EditAccountSheet({ account, onSaved }: { account: AccountDetail; onSaved: () => void }) {
  const ids = { name: useId(), policy: useId(), cap: useId(), rules: useId(), reason: useId() }
  const { register, handleSubmit, watch, setFocus } = useForm<AccountFormValues>({
    defaultValues: initialEditValues(account),
  })
  const { shown, attempt, show, clear } = useShown(setFocus)
  const write = useAccountWrite()
  const refresh = useRefreshAccount()
  const ruleSets = useQuery(matchingRuleSetsQuery(account.providerId))
  const sending = useRef(false)
  const values = watch()

  const submit = handleSubmit(async (form) => {
    if (sending.current) return
    const result = patchBody(form, account)
    if (!result.ok) return show({ fields: result.errors, general: result.general })
    clear()
    sending.current = true
    try {
      await write.mutateAsync({ kind: 'patch', accountId: account.accountId, body: result.body })
      onSaved()
    } catch (error) {
      const problem = accountProblemOf(error)
      show({ fields: problem.fields, general: problem.general })
      if (problem.invalidate) void refresh(problem.invalidate, account)
    } finally {
      sending.current = false
    }
  })

  const pending = write.isPending
  return (
    <SheetContent className="overflow-y-auto sm:max-w-md" showCloseButton={!pending} {...keepOpenWhile(pending)}>
      <SheetHeader>
        <SheetTitle className="[overflow-wrap:anywhere]">{f.editTitle(account.name)}</SheetTitle>
        <SheetDescription>{f.editDescription}</SheetDescription>
      </SheetHeader>
      <form className="flex flex-col gap-4 px-4 pb-4" noValidate onSubmit={(event) => void submit(event)}>
        <Field id={ids.name} label={f.labels.name} error={shown.fields.name} help={f.nameHelp}>
          <input
            id={ids.name}
            className={controlClass}
            autoComplete="off"
            {...register('name')}
            {...invalidProps(shown, 'name', ids.name)}
          />
        </Field>
        <Field id={ids.policy} label={f.labels.policy}>
          <select id={ids.policy} className={controlClass} {...register('policy')} value={values.policy}>
            {POLICIES.map((policy) => (
              <option key={policy} value={policy}>
                {f.policies[policy]}
              </option>
            ))}
          </select>
        </Field>
        <Field id={ids.cap} label={f.labels.cap} error={shown.fields.cap}>
          <input
            id={ids.cap}
            inputMode="decimal"
            placeholder={f.capPlaceholder}
            className={`${controlClass} tabular-nums`}
            {...register('cap')}
            {...invalidProps(shown, 'cap', ids.cap)}
          />
        </Field>
        <Field id={ids.rules} label={f.labels.matchingRules} error={shown.fields.ruleSetId}>
          <select
            id={ids.rules}
            className={controlClass}
            {...register('ruleSetId')}
            value={values.ruleSetId}
            {...invalidProps(shown, 'ruleSetId', ids.rules)}
          >
            <option value="">{f.globalRules}</option>
            {ruleSetOptions(ruleSets.data, account.matchingRuleSetId).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id={ids.reason} label={f.labels.reason} error={shown.fields.reason}>
          <textarea
            id={ids.reason}
            className={`${controlClass} h-auto min-h-16 py-2`}
            maxLength={500}
            {...register('reason')}
            {...invalidProps(shown, 'reason', ids.reason)}
          />
        </Field>
        <GeneralMessage message={shown.general} attempt={attempt} />
        <div className="flex justify-end gap-2">
          <SheetClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              {f.cancel}
            </Button>
          </SheetClose>
          <Button type="submit" disabled={pending}>
            {pending ? f.saving : f.save}
          </Button>
        </div>
      </form>
    </SheetContent>
  )
}
