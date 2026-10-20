import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { strings } from './strings'

const s = strings.pager

/**
 * Previous / Next of a table paged on the server. A disabled button carries its reason as visible text through
 * aria-describedby (spec "Pantallas de settlement: teclado y motivos").
 */
export function Pager({
  summary,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
}: {
  /** "Page N of M · T …", from the integers of the answer. */
  summary: string
  canPrevious: boolean
  canNext: boolean
  onPrevious: () => void
  onNext: () => void
}) {
  const reasons = { previous: useId(), next: useId() }
  return (
    <div className="flex flex-col items-end gap-1 text-sm">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-muted-foreground">{summary}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={onPrevious}
          disabled={!canPrevious}
          aria-describedby={canPrevious ? undefined : reasons.previous}
        >
          {s.previous}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onNext}
          disabled={!canNext}
          aria-describedby={canNext ? undefined : reasons.next}
        >
          {s.next}
        </Button>
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground">
        {!canPrevious && <span id={reasons.previous}>{s.firstPage}</span>}
        {!canNext && <span id={reasons.next}>{s.lastPage}</span>}
      </div>
    </div>
  )
}
