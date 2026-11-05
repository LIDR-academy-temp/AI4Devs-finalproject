import { useId } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { strings } from './strings'

const s = strings.decision.emptyBatch

/**
 * An import without matched rows of the account (README §3.3 "Batch sin filas asociadas", #92): a batch with batch
 * fees only is legitimate, so it is not blocked, but continuing needs this box. When every unmatched row is
 * `id_format` the API says the files probably belong to another account, and the notice says so.
 */
export function EmptyBatchConfirmation({
  likelyWrongAccount,
  confirmed,
  onConfirmedChange,
  disabled,
}: {
  likelyWrongAccount: boolean
  confirmed: boolean
  onConfirmedChange: (confirmed: boolean) => void
  disabled: boolean
}) {
  const boxId = useId()
  return (
    <section aria-label={s.label} className="flex flex-col gap-2 rounded-md border border-amber-500/60 p-3 text-sm">
      <p>{s.noMatchedRows}</p>
      {likelyWrongAccount && <p className="font-medium">{s.wrongAccount}</p>}
      <div className="flex items-center gap-2">
        <Checkbox
          id={boxId}
          checked={confirmed}
          disabled={disabled}
          onCheckedChange={(checked) => onConfirmedChange(checked === true)}
        />
        <Label htmlFor={boxId}>{s.confirm}</Label>
      </div>
    </section>
  )
}
