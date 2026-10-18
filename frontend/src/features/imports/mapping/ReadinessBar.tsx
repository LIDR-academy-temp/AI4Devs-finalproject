import type { ImportDetail } from '@/lib/api/types'
import { strings } from '../strings'

/** Sheets whose mapping is not confirmed in a mapped import: the detail's readiness does not list them (design D7). */
export function unconfirmedSheets(detail: ImportDetail) {
  if (detail.status !== 'mapped') return []
  return detail.files.flatMap((f) => f.sheets).filter((s) => !s.mappingConfirmed)
}

/**
 * The readiness of the server (design D7): `Ready to analyze` or what is missing per sheet and field, plus what to
 * review. `missing` can be replaced by the one of a `422 mapping_incomplete` until the next detail.
 */
export function ReadinessBar({
  detail,
  missing = detail.readiness.missing,
}: {
  detail: ImportDetail
  missing?: ImportDetail['readiness']['missing']
}) {
  const unconfirmed = unconfirmedSheets(detail).filter((s) => !missing.some((m) => m.sheetId === s.sheetId))
  const ready = missing.length === 0 && unconfirmed.length === 0

  return (
    <div
      role="status"
      aria-label={strings.readiness.label}
      className={`flex flex-col gap-2 rounded-md border p-3 text-sm ${ready ? 'border-emerald-600/40 bg-emerald-50 dark:bg-emerald-950/30' : 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/30'}`}
    >
      {ready ? (
        <p className="font-medium">{strings.readiness.ready}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {missing.map((item) => (
            <li key={`${item.sheetId}:${item.field}:${item.message}`}>
              {strings.readiness.item(item.sheetName, item.field, item.message)}
            </li>
          ))}
          {unconfirmed.map((sheet) => (
            <li key={sheet.sheetId}>{strings.readiness.unconfirmed(sheet.sheetName)}</li>
          ))}
        </ul>
      )}
      {detail.readiness.notes.length > 0 && (
        <details className="text-muted-foreground">
          <summary className="cursor-pointer">
            {strings.readiness.notes} ({detail.readiness.notes.length})
          </summary>
          <ul className="mt-1 flex flex-col gap-0.5">
            {detail.readiness.notes.map((note) => (
              <li key={`${note.sheetId}:${note.message}`}>
                {note.sheetName ?? 'Import'} · {note.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
