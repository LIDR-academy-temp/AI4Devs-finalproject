import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { strings } from './strings'

/**
 * Process batch N, disabled with every reason that applies visible and linked by aria-describedby (design D10). The
 * reasons come from the screen, which knows the form, the preview and what is on its way.
 */
export function ProcessBar({
  batchNo,
  reasons,
  processing,
  error,
  onProcess,
}: {
  batchNo: string | number
  reasons: string[]
  processing: boolean
  error: string | null
  onProcess: () => void
}) {
  const reasonsId = useId()
  const disabled = processing || reasons.length > 0
  const shown = processing ? [strings.process.processing] : reasons
  return (
    <section className="flex flex-col items-end gap-2 border-t pt-3">
      <Button onClick={onProcess} disabled={disabled} aria-describedby={shown.length > 0 ? reasonsId : undefined}>
        {strings.process.label(batchNo)}
      </Button>
      <div id={reasonsId} aria-live="polite" className="flex flex-col items-end text-sm text-muted-foreground">
        {shown.map((reason) => (
          <p key={reason}>{reason}</p>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  )
}
