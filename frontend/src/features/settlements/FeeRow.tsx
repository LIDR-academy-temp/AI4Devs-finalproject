import { useId } from 'react'
import { useFormContext } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { FeeTypeView } from './contract'
import type { ReviewFormValues, FeeRow as Row } from './review-form'
import { strings } from './strings'

const s = strings.fees

/** A 400 batch_fee_invalid shown in its row until the row changes (design D6). */
export interface RowApiError {
  field: 'amount' | 'description'
  message: string
}

export const selectClass =
  'h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

function Message({ id, text, tone = 'error' }: { id: string; text: string | null; tone?: 'error' | 'note' }) {
  if (!text) return null
  return (
    <p id={id} className={cn('text-sm', tone === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
      {text}
    </p>
  )
}

/**
 * One batch fee: its origin, the type (to choose for a file fee of unknown type), the amount and the description,
 * with the errors of the form and of the API under the field they are about. Nothing here decides a rule: what may
 * be chosen comes from the API (allowsFreeAmount), what is valid from the schema of the form.
 */
export function FeeRowItem({
  index,
  row,
  freeTypes,
  issues,
  apiError,
  onRemove,
}: {
  index: number
  row: Row
  freeTypes: FeeTypeView[]
  /** The messages of the form schema by path. */
  issues: Record<string, string>
  apiError: RowApiError | null
  onRemove: () => void
}) {
  const { register } = useFormContext<ReviewFormValues>()
  const ids = { type: useId(), amount: useId(), description: useId(), note: useId() }
  const typeError = issues[`fees.${index}.feeTypeId`] ?? null
  const amountError = issues[`fees.${index}.amount`] ?? (apiError?.field === 'amount' ? apiError.message : null)
  const descriptionError =
    issues[`fees.${index}.description`] ?? (apiError?.field === 'description' ? apiError.message : null)
  const note =
    row.origin === 'preset' && row.percentage && !row.amount
      ? s.percentageOnly(row.percentage)
      : row.currency && row.currency !== 'USD'
        ? s.currency(row.currency)
        : null

  return (
    <li
      aria-label={row.title}
      className={cn('flex flex-col gap-2 rounded-md border p-3', typeError && 'border-amber-500 bg-amber-50/50')}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{row.title}</span>
          <Badge variant="outline">{s.origins[row.origin]}</Badge>
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          {s.remove(row.title)}
        </Button>
      </div>
      {row.fileWarning && <p className="text-sm text-amber-700 dark:text-amber-400">{row.fileWarning}</p>}
      {row.chooseType && (
        <div className="flex flex-col gap-1">
          <select
            aria-label={s.type(row.title)}
            aria-invalid={typeError !== null}
            aria-describedby={typeError ? ids.type : undefined}
            className={selectClass}
            {...register(`fees.${index}.feeTypeId`, {
              setValueAs: (value: unknown) => (value === '' || value === null ? null : Number(value)),
            })}
          >
            <option value="">{s.chooseType}</option>
            {freeTypes.map((type) => (
              <option key={type.feeTypeId} value={type.feeTypeId}>
                {type.title}
              </option>
            ))}
          </select>
          <Message id={ids.type} text={typeError} />
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-1">
          <Input
            aria-label={s.amount(row.title)}
            inputMode="decimal"
            autoComplete="off"
            className="text-right tabular-nums"
            aria-invalid={amountError !== null}
            aria-describedby={[amountError && ids.amount, note && ids.note].filter(Boolean).join(' ') || undefined}
            {...register(`fees.${index}.amount`)}
          />
          <Message id={ids.amount} text={amountError} />
        </div>
        <div className="flex flex-col gap-1">
          <Input
            aria-label={s.description(row.title)}
            autoComplete="off"
            aria-invalid={descriptionError !== null}
            aria-describedby={descriptionError ? ids.description : undefined}
            {...register(`fees.${index}.description`)}
          />
          <Message id={ids.description} text={descriptionError} />
        </div>
      </div>
      <Message id={ids.note} text={note} tone="note" />
    </li>
  )
}
