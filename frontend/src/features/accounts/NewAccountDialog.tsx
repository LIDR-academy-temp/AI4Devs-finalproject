import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useId, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { type AccountFormValues, createBody, initialCreateValues } from './account-form'
import { useAccountWrite, useRefreshAccount } from './mutations'
import { matchingRuleSetsQuery, merchantsQuery, providerQuery, providersQuery } from './queries'
import { strings } from './strings'

const f = strings.form

const toId = (value: string) => (value === '' ? undefined : Number.parseInt(value, 10))

/**
 * New account (spec accounts "Pantalla New account", web-admin-accounts design D7): a dialog over the list, with
 * merchant and provider taken from the page. Fees and matching rules are offered for the chosen provider and go back
 * to their defaults when it changes. The dialog keeps what was written after any error; with 201 it opens the
 * detail of the new account. It is the content of the Dialog of the page, whose Trigger is New account.
 */
export function NewAccountDialog({ merchantId, providerId }: { merchantId?: number; providerId?: number }) {
  const ids = {
    name: useId(),
    merchant: useId(),
    provider: useId(),
    policy: useId(),
    cap: useId(),
    fees: useId(),
    rules: useId(),
  }
  const { register, handleSubmit, watch, setValue, setFocus } = useForm<AccountFormValues>({
    defaultValues: initialCreateValues({ merchantId, providerId }),
  })
  const { shown, show, clear } = useShown(setFocus)
  const write = useAccountWrite()
  const refresh = useRefreshAccount()
  const navigate = useNavigate()
  // A second click before the button is disabled must not send a second request.
  const sending = useRef(false)

  const values = watch()
  const chosenMerchant = toId(values.merchantId)
  const chosenProvider = toId(values.providerId)
  const merchants = useQuery(merchantsQuery)
  const providers = useQuery({ ...providersQuery(chosenMerchant ?? 0), enabled: chosenMerchant !== undefined })
  const provider = useQuery({ ...providerQuery(chosenProvider ?? 0), enabled: chosenProvider !== undefined })
  const ruleSets = useQuery({ ...matchingRuleSetsQuery(chosenProvider ?? 0), enabled: chosenProvider !== undefined })

  const resetChoices = () => {
    setValue('copyFrom', '')
    setValue('ruleSetId', '')
  }

  const submit = handleSubmit(async (form) => {
    if (sending.current) return
    const result = createBody(form)
    if (!result.ok) return show({ fields: result.errors, general: result.general })
    clear()
    sending.current = true
    try {
      const created = await write.mutateAsync({ kind: 'create', providerId: result.providerId, body: result.body })
      await navigate({ to: '/accounts/$accountId', params: { accountId: created.accountId } })
    } catch (error) {
      const problem = accountProblemOf(error)
      show({ fields: problem.fields, general: problem.general })
      if (problem.invalidate) void refresh(problem.invalidate, { providerId: result.providerId })
    } finally {
      sending.current = false
    }
  })

  const pending = write.isPending
  return (
    <DialogContent className="sm:max-w-xl" showCloseButton={!pending} {...keepOpenWhile(pending)}>
      <DialogHeader>
        <DialogTitle>{f.createTitle}</DialogTitle>
        <DialogDescription>{f.createDescription}</DialogDescription>
      </DialogHeader>
      <form className="flex flex-col gap-4" noValidate onSubmit={(event) => void submit(event)}>
        <Field id={ids.name} label={f.labels.name} error={shown.fields.name} help={f.nameHelp}>
          <input
            id={ids.name}
            className={controlClass}
            autoComplete="off"
            {...register('name')}
            {...invalidProps(shown, 'name', ids.name)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={ids.merchant} label={f.labels.merchant} error={shown.fields.merchantId}>
            <select
              id={ids.merchant}
              className={controlClass}
              {...register('merchantId', {
                onChange: () => {
                  setValue('providerId', '')
                  resetChoices()
                },
              })}
              value={values.merchantId}
              {...invalidProps(shown, 'merchantId', ids.merchant)}
            >
              <option value="">{f.chooseMerchant}</option>
              {merchants.data?.map((m) => (
                <option key={m.merchantId} value={m.merchantId}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id={ids.provider} label={f.labels.provider} error={shown.fields.providerId}>
            <select
              id={ids.provider}
              className={controlClass}
              disabled={chosenMerchant === undefined}
              {...register('providerId', { onChange: resetChoices })}
              value={values.providerId}
              {...invalidProps(shown, 'providerId', ids.provider)}
            >
              <option value="">{f.chooseProvider}</option>
              {(chosenMerchant === undefined ? [] : (providers.data ?? [])).map((p) => (
                <option key={p.providerId} value={p.providerId}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={ids.fees} label={f.labels.fees} error={shown.fields.copyFrom}>
            <select
              id={ids.fees}
              className={controlClass}
              {...register('copyFrom')}
              value={values.copyFrom}
              {...invalidProps(shown, 'copyFrom', ids.fees)}
            >
              <option value="">{f.noFees}</option>
              {(chosenProvider === undefined ? [] : (provider.data?.accounts ?? [])).map((a) => (
                <option key={a.accountId} value={a.accountId}>
                  {a.isActive ? a.name : f.closedAccount(a.name)}
                </option>
              ))}
            </select>
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
              {(chosenProvider === undefined ? [] : ruleSetOptions(ruleSets.data, null)).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">{f.feesHelp}</p>
        <GeneralMessage message={shown.general} />
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              {f.cancel}
            </Button>
          </DialogClose>
          <Button type="submit" disabled={pending}>
            {pending ? f.saving : f.create}
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}
