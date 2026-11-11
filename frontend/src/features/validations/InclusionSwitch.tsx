import { useId } from 'react'
import { Switch } from '@/components/ui/switch'
import type { OccurrenceView } from './contract'
import { whereOf } from './Occurrences'
import { strings } from './strings'

const s = strings.inclusion

/**
 * Whether an occurrence is included now (design D7). Editable: a switch; not includable, it can only be excluded,
 * and once excluded it shows why it cannot come back. Not editable: text. The flags come from the API as they are.
 */
export function InclusionSwitch({
  occurrence,
  busy,
  onChange,
}: {
  occurrence: OccurrenceView
  busy: boolean
  onChange: (occurrence: OccurrenceView, to: boolean) => void
}) {
  const reasonId = useId()
  const state = occurrence.includeInSettlement ? strings.drawer.included : strings.drawer.excluded
  if (!occurrence.editable) return <span className="font-medium">{state}</span>

  const canToggle = occurrence.includable || occurrence.includeInSettlement
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Switch
          checked={occurrence.includeInSettlement}
          onCheckedChange={(to) => onChange(occurrence, to)}
          disabled={busy || !canToggle}
          aria-label={s.label(whereOf(occurrence))}
          aria-describedby={canToggle ? undefined : reasonId}
        />
        <span className="font-medium">{state}</span>
      </div>
      {!canToggle && (
        <p id={reasonId} className="text-xs text-muted-foreground">
          {s.notIncludable}
        </p>
      )}
    </div>
  )
}
