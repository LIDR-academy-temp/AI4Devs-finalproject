import { Badge } from '@/components/ui/badge'
import { formatAuditDateTime } from '@/lib/format'
import { BATCH_STATUS_TONE, toneOf } from '@/lib/status-tone'
import type { OccurrenceView } from './contract'
import { strings } from './strings'

const s = strings.drawer

/** `file · sheet · row N`, or the batch of a historical movement. */
export function whereOf(occurrence: OccurrenceView): string {
  if (occurrence.location) {
    const { fileName, sheetName, rowNo } = occurrence.location
    if (occurrence.sourceType === 'current_import' || !occurrence.batch) return s.location(fileName, sheetName, rowNo)
  }
  if (occurrence.batch) {
    const { batchNo, attemptNo, accountName } = occurrence.batch
    return s.batch(batchNo, attemptNo, accountName)
  }
  return s.noLocation
}

/**
 * Every occurrence of a finding, in the API order (spec "detalle de un hallazgo"). `inclusion` renders the control
 * or the text of whether it is included now.
 */
export function Occurrences({
  occurrences,
  inclusion,
}: {
  occurrences: OccurrenceView[]
  inclusion: (occurrence: OccurrenceView) => React.ReactNode
}) {
  return (
    <section aria-label={s.occurrences} className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{s.occurrences}</h3>
      {occurrences.length === 0 ? (
        <p className="text-sm text-muted-foreground">{s.noOccurrences}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {occurrences.map((occurrence) => (
            <li
              key={occurrence.occurrenceId}
              aria-label={whereOf(occurrence)}
              className="flex flex-col gap-1 rounded-md border p-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{whereOf(occurrence)}</span>
                {occurrence.batch && (
                  <Badge variant={toneOf(BATCH_STATUS_TONE, occurrence.batch.status)}>{occurrence.batch.status}</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                <span>{occurrence.status?.name ?? s.unresolvedStatus}</span>
                {occurrence.excludeAmount && <Badge variant="secondary">{s.chb2}</Badge>}
                <span>{occurrence.defaultIncluded ? s.includedByDefault : s.excludedByDefault}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {inclusion(occurrence)}
                {occurrence.changedBy && occurrence.changedAt && (
                  <span className="text-xs text-muted-foreground">
                    {s.changedBy(occurrence.changedBy.userName, formatAuditDateTime(occurrence.changedAt))}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
