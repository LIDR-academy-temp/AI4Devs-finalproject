import { useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { AccountFee, FeeCreateBody } from './contract'
import type { FeeTypeInfo } from './FeesTable'
import { shiftDay } from './fee-display'
import { feeProblemOf } from './fee-errors'
import { type FeeFormField, type FeeFormMode, type FeeFormValues, feeFormBody, initialFeeValues } from './fee-form'
import { useFeeWrite, useRefreshAccountFees } from './mutations'
import { strings } from './strings'

const f = strings.form

const controlClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-destructive'

export interface FeeFormTarget {
  mode: FeeFormMode
  fee?: AccountFee
}

interface Shown {
  fields: Partial<Record<FeeFormField, string>>
  general: string | null
  conflicts: string[]
}

const NOTHING: Shown = { fields: {}, general: null, conflicts: [] }

type FeeTypeOption = FeeTypeInfo & { title: string }

/**
 * Add, correct in place or change from a date (web-admin-fees design D4), in a side panel so the list stays in
 * view. The form keeps what was written after any error; it closes only when the API accepted the write.
 */
export function FeeFormSheet({
  target,
  accountId,
  feeTypes,
  onDone,
}: {
  target: FeeFormTarget
  accountId: string
  feeTypes: readonly FeeTypeOption[] | undefined
  onDone: () => void
}) {
  const { mode, fee } = target
  const ids = {
    type: useId(),
    amount: useId(),
    percent: useId(),
    from: useId(),
    always: useId(),
    to: useId(),
    noEnd: useId(),
    description: useId(),
    reason: useId(),
    effective: useId(),
    notice: useId(),
  }
  const { register, handleSubmit, watch } = useForm<FeeFormValues>({ defaultValues: initialFeeValues(mode, fee) })
  const write = useFeeWrite(accountId)
  const refresh = useRefreshAccountFees(accountId)
  const [shown, setShown] = useState<Shown>(NOTHING)
  // A second click before the button is disabled must not send a second request.
  const sending = useRef(false)

  const inUse = mode === 'correct' && fee?.inUse === true
  const locked = inUse || mode === 'change'
  const always = watch('always')
  const noEnd = watch('noEnd')
  const effectiveFrom = watch('effectiveFrom')
  const typeTitle = fee?.title ?? feeTypes?.find((t) => String(t.feeTypeId) === watch('feeTypeId'))?.title ?? ''

  const submit = handleSubmit(async (values) => {
    if (sending.current) return
    const result = feeFormBody(mode, values, fee)
    if (!result.ok) {
      setShown({ fields: result.errors, general: result.general, conflicts: [] })
      return
    }
    setShown(NOTHING)
    sending.current = true
    try {
      await write.mutateAsync(
        mode === 'create'
          ? { kind: 'create', body: result.body as FeeCreateBody }
          : { kind: 'patch', feeId: fee!.feeId, body: result.body },
      )
      onDone()
    } catch (error) {
      const problem = feeProblemOf(error, typeTitle)
      setShown({ fields: problem.fields, general: problem.general, conflicts: problem.conflicts })
      if (problem.refetch) void refresh()
    } finally {
      sending.current = false
    }
  })

  const errorId = (field: FeeFormField) => `${ids.notice}-${field}`
  const invalid = (field: FeeFormField) => ({
    'aria-invalid': shown.fields[field] ? true : undefined,
    'aria-describedby': shown.fields[field] ? errorId(field) : undefined,
  })
  const error = (field: FeeFormField) =>
    shown.fields[field] ? (
      <p id={errorId(field)} className="text-sm text-destructive">
        {shown.fields[field]}
      </p>
    ) : null
  const label = (id: string, text: string) => (
    <label htmlFor={id} className="text-sm font-medium">
      {text}
    </label>
  )

  const title =
    mode === 'create'
      ? f.titles.create
      : mode === 'correct'
        ? f.titles.correct(fee!.title)
        : f.titles.change(fee!.title)
  const pending = write.isPending

  return (
    <Sheet open onOpenChange={(open) => !open && !pending && onDone()}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {mode === 'change' ? f.changeNotice : mode === 'create' ? f.descriptions.create : f.descriptions.correct}
          </SheetDescription>
        </SheetHeader>
        <form
          aria-label={f.formLabel}
          aria-describedby={inUse ? ids.notice : undefined}
          className="flex flex-col gap-4 px-4 pb-4"
          noValidate
          onSubmit={(event) => void submit(event)}
        >
          {inUse && (
            <p id={ids.notice} className="rounded-md border p-2 text-sm text-muted-foreground">
              {f.inUseNotice}
            </p>
          )}
          {mode === 'create' && (
            <div className="flex flex-col gap-1.5">
              {label(ids.type, f.labels.feeType)}
              <select id={ids.type} className={controlClass} {...register('feeTypeId')} {...invalid('feeTypeId')}>
                <option value="">{f.chooseType}</option>
                {feeTypes?.map((type) => (
                  <option key={type.feeTypeId} value={type.feeTypeId}>
                    {type.title}
                  </option>
                ))}
              </select>
              {error('feeTypeId')}
            </div>
          )}
          {mode === 'change' && (
            <div className="flex flex-col gap-1.5">
              {label(ids.effective, f.labels.effectiveFrom)}
              <input
                id={ids.effective}
                type="date"
                className={controlClass}
                min={fee?.lastAppliedEventDate ? shiftDay(fee.lastAppliedEventDate, 1) : undefined}
                {...register('effectiveFrom')}
                {...invalid('effectiveFrom')}
              />
              {effectiveFrom && (
                <p className="text-sm text-muted-foreground">{f.endsOn(shiftDay(effectiveFrom, -1))}</p>
              )}
              {error('effectiveFrom')}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              {label(ids.amount, f.labels.fixedAmount)}
              <input
                id={ids.amount}
                inputMode="decimal"
                className={`${controlClass} tabular-nums`}
                disabled={inUse}
                {...register('fixedAmount')}
                {...invalid('fixedAmount')}
              />
              {error('fixedAmount')}
            </div>
            <div className="flex flex-col gap-1.5">
              {label(ids.percent, f.labels.percent)}
              <input
                id={ids.percent}
                inputMode="decimal"
                className={`${controlClass} tabular-nums`}
                disabled={inUse}
                {...register('percent')}
                {...invalid('percent')}
              />
              {error('percent')}
            </div>
          </div>
          {mode !== 'change' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                {label(ids.from, f.labels.validFrom)}
                <input
                  id={ids.from}
                  type="date"
                  className={controlClass}
                  disabled={locked || always}
                  {...register('startDate')}
                  {...invalid('startDate')}
                />
                <span className="flex items-center gap-2 text-sm">
                  <input id={ids.always} type="checkbox" disabled={locked} {...register('always')} />
                  <label htmlFor={ids.always}>{f.labels.always}</label>
                </span>
                {error('startDate')}
              </div>
              <div className="flex flex-col gap-1.5">
                {label(ids.to, f.labels.validTo)}
                <input
                  id={ids.to}
                  type="date"
                  className={controlClass}
                  disabled={noEnd}
                  {...register('endDate')}
                  {...invalid('endDate')}
                />
                <span className="flex items-center gap-2 text-sm">
                  <input id={ids.noEnd} type="checkbox" {...register('noEnd')} />
                  <label htmlFor={ids.noEnd}>{f.labels.noEnd}</label>
                </span>
                {error('endDate')}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            {label(ids.description, f.labels.description)}
            <input
              id={ids.description}
              className={controlClass}
              maxLength={100}
              {...register('description')}
              {...invalid('description')}
            />
            {error('description')}
          </div>
          {mode !== 'create' && (
            <div className="flex flex-col gap-1.5">
              {label(ids.reason, f.labels.reason)}
              <textarea
                id={ids.reason}
                className={`${controlClass} h-auto min-h-16 py-2`}
                maxLength={500}
                {...register('reason')}
                {...invalid('reason')}
              />
              {error('reason')}
            </div>
          )}
          {(shown.general || shown.conflicts.length > 0) && (
            <div role="alert" className="rounded-md border border-destructive/40 p-2 text-sm text-destructive">
              {shown.general && <p>{shown.general}</p>}
              {shown.conflicts.length > 0 && (
                <ul className="list-disc pl-5">
                  {shown.conflicts.map((conflict) => (
                    <li key={conflict}>{conflict}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={onDone}>
              {f.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? f.saving : mode === 'change' ? f.apply : f.save}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
