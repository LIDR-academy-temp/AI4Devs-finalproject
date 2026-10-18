import { formatAuditDateTime } from '@/lib/format'
import type { IssueHistoryEntry, OccurrenceView } from './contract'
import { whereOf } from './Occurrences'
import { strings } from './strings'

const s = strings.drawer

/** Who changed what and when, oldest first, as the API orders it: every change, not only the last one. */
export function IssueHistory({
  history,
  occurrences,
}: {
  history: IssueHistoryEntry[]
  occurrences: OccurrenceView[]
}) {
  const text = (entry: IssueHistoryEntry) => {
    const at = formatAuditDateTime(entry.at)
    if (entry.action === 'resolve') return s.resolveEntry(entry.user.userName, at, entry.note ?? '')
    const occurrence = occurrences.find((o) => o.occurrenceId === entry.occurrenceId)
    const where = occurrence ? whereOf(occurrence) : `#${entry.occurrenceId}`
    return s.inclusionEntry(entry.user.userName, at, where, entry.from ?? false, entry.to ?? false)
  }

  return (
    <section aria-label={s.history} className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{s.history}</h3>
      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground">{s.noHistory}</p>
      ) : (
        <ol className="flex flex-col gap-1 text-sm">
          {history.map((entry) => (
            <li key={`${entry.at}:${entry.action}:${entry.occurrenceId ?? ''}`}>{text(entry)}</li>
          ))}
        </ol>
      )}
    </section>
  )
}
