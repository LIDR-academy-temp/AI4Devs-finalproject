import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ImportFile } from '@/lib/api/types'
import { strings } from '../strings'
import type { QueueEntry } from './upload-queue'

/**
 * The files of the import with their sheets and rows, followed by those of the queue: pending, uploading or
 * rejected with their reason. Changes are announced politely (design D4).
 */
export function FileList({
  files,
  entries,
  onRemove,
  removeDisabled = false,
}: {
  files: readonly ImportFile[]
  entries: readonly QueueEntry[]
  /** Absent when files cannot be removed (permission or status). */
  onRemove?: (file: ImportFile) => void
  removeDisabled?: boolean
}) {
  return (
    <ul aria-label={strings.files.label} aria-live="polite" className="flex flex-col gap-3">
      {files.map((file) => (
        <li key={file.fileId} aria-label={file.fileName} className="flex flex-col gap-2 rounded-md border p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="break-all font-medium">{file.fileName}</span>
            {onRemove && (
              <Button
                variant="outline"
                size="sm"
                aria-label={strings.files.remove(file.fileName)}
                disabled={removeDisabled}
                onClick={() => onRemove(file)}
              >
                {strings.files.removeLabel}
              </Button>
            )}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {file.sheets.map((sheet) => (
              <li key={sheet.sheetId} className="flex items-center gap-1.5">
                <span>{strings.files.sheet(sheet.sheetName, sheet.rowCount)}</span>
                {sheet.hidden && (
                  <Badge variant="outline" className="text-[10px]">
                    {strings.files.hidden}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </li>
      ))}
      {entries.map((entry) => (
        <li
          key={entry.id}
          aria-label={entry.fileName}
          className={`flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm ${entry.state === 'rejected' ? 'border-destructive/50' : 'border-dashed'}`}
        >
          <span className="break-all font-medium">{entry.fileName}</span>
          <span className={entry.state === 'rejected' ? 'text-destructive' : 'text-muted-foreground'}>
            {entry.state === 'rejected'
              ? entry.reason
              : entry.state === 'uploading'
                ? strings.files.uploading
                : strings.files.pending}
          </span>
        </li>
      ))}
    </ul>
  )
}
