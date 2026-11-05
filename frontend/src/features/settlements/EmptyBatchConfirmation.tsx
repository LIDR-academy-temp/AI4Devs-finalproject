import { useId } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { ReviewFormValues } from './review-form'
import { strings } from './strings'

const s = strings.emptyBatch

/**
 * A batch without matched rows of the account (README §3.3 "Batch sin filas asociadas", #92), from the preview (or
 * from a 409 until the next preview): only the batch fees will be processed, so Process waits for this box. The API
 * decides when it is one, and when the files probably belong to another account.
 */
export function EmptyBatchConfirmation({
  likelyWrongAccount,
  disabled,
}: {
  likelyWrongAccount: boolean
  disabled: boolean
}) {
  const { control } = useFormContext<ReviewFormValues>()
  const boxId = useId()
  return (
    <section aria-label={s.label} className="flex flex-col gap-2 rounded-md border border-amber-500/60 p-3 text-sm">
      <p>{s.noMatchedRows}</p>
      {likelyWrongAccount && <p className="font-medium">{s.wrongAccount}</p>}
      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name="confirmEmptyBatch"
          render={({ field }) => (
            <Checkbox
              id={boxId}
              checked={field.value}
              disabled={disabled}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              onBlur={field.onBlur}
              ref={field.ref}
            />
          )}
        />
        <Label htmlFor={boxId}>{s.confirm}</Label>
      </div>
    </section>
  )
}
