import type { ImportDetail, ImportFile, ImportSheet } from '@/lib/api/types'
import { strings } from '../strings'

type Item = ImportDetail['readiness']['missing'][number]
type Line = { key: string; sheet: string; text: string }

// Notes of the backend's readiness (domain/readiness.ts) that only describe the sheet: nothing to act on.
const NO_ROWS = 'The sheet has no rows'
const HIDDEN = 'The sheet is hidden in the workbook'

/** Sheets whose mapping is not confirmed in a mapped import: the detail's readiness does not list them (design D7). */
export function unconfirmedSheets(detail: ImportDetail) {
  if (detail.status !== 'mapped') return []
  return detail.files.flatMap((f) => f.sheets).filter((s) => !s.mappingConfirmed)
}

/** A sheet without rows, hidden or ignored by its proposal: every note it gets is informational. */
function informational(note: Item, sheet: ImportSheet | undefined): boolean {
  return note.message === NO_ROWS || note.message === HIDDEN || sheet?.proposed.kind === 'ignore'
}

const sheetOf = (item: Item) => item.sheetName ?? strings.readiness.importSheet
const missingLine = (item: Item): Line => ({
  key: `missing:${item.sheetId}:${item.field}:${item.message}`,
  sheet: sheetOf(item),
  text: strings.readiness.item(item.field, item.message),
})
const noteLine = (note: Item): Line => ({
  key: `note:${note.sheetId}:${note.message}`,
  sheet: sheetOf(note),
  text: note.message,
})

type Group = { file: ImportFile; actionable: Line[]; informational: Line[] }

/** What is missing and what to review, per file: what is not about one sheet goes first, apart. */
function groupsOf(detail: ImportDetail, missing: Item[], unconfirmed: ImportSheet[]) {
  const fileOf = new Map(detail.files.flatMap((f) => f.sheets.map((s) => [s.sheetId, { file: f, sheet: s }] as const)))
  const own = (item: Item) => (item.sheetId === null ? undefined : fileOf.get(item.sheetId))
  const general = [
    ...missing.filter((m) => !own(m)).map(missingLine),
    ...detail.readiness.notes.filter((n) => !own(n)).map(noteLine),
  ]
  const groups: Group[] = detail.files.map((file) => {
    const mine = (item: Item) => own(item)?.file.fileId === file.fileId
    const notes = detail.readiness.notes.filter(mine)
    const sheets = new Set(file.sheets.map((s) => s.sheetId))
    return {
      file,
      actionable: [
        ...missing.filter(mine).map(missingLine),
        ...unconfirmed
          .filter((s) => sheets.has(s.sheetId))
          .map((s) => ({ key: `confirm:${s.sheetId}`, sheet: s.sheetName, text: strings.readiness.unconfirmed })),
        ...notes.filter((n) => !informational(n, own(n)?.sheet)).map(noteLine),
      ],
      informational: notes.filter((n) => informational(n, own(n)?.sheet)).map(noteLine),
    }
  })
  return { general, groups: groups.filter((g) => g.actionable.length + g.informational.length > 0) }
}

function Lines({ lines }: { lines: Line[] }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {lines.map((line) => (
        <li key={line.key} className="grid grid-cols-[minmax(4rem,max-content)_1fr] gap-x-2">
          <strong className="font-semibold">{line.sheet}</strong>
          <span>
            <span className="sr-only">{strings.readiness.separator}</span>
            {line.text}
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * The readiness of the server (design D7): `Ready to analyze` or what is missing, then what to review, grouped by
 * file with the actionable lines first and the informational notes folded. `missing` can be replaced by the one of
 * a `422 mapping_incomplete` until the next detail.
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
  const { general, groups } = groupsOf(detail, missing, unconfirmed)

  return (
    <div
      role="status"
      aria-label={strings.readiness.label}
      className={`flex flex-col gap-3 rounded-md border p-3 text-sm ${ready ? 'border-emerald-600/40 bg-emerald-50 dark:bg-emerald-950/30' : 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/30'}`}
    >
      {ready && <p className="font-medium">{strings.readiness.ready}</p>}
      {general.length > 0 && <Lines lines={general} />}
      {groups.map(({ file, actionable, informational }) => (
        <section key={file.fileId} aria-label={strings.readiness.file(file.fileName)} className="flex flex-col gap-1">
          <h3 className="break-all text-xs font-semibold">{file.fileName}</h3>
          {actionable.length > 0 && <Lines lines={actionable} />}
          {informational.length > 0 && (
            <details className="text-muted-foreground">
              <summary className="cursor-pointer">{strings.readiness.informational(informational.length)}</summary>
              <div className="mt-1">
                <Lines lines={informational} />
              </div>
            </details>
          )}
        </section>
      ))}
    </div>
  )
}
