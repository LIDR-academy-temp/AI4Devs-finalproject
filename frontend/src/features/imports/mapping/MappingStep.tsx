import { Button } from '@/components/ui/button'
import type { ImportDetail } from '@/lib/api/types'
import { strings } from '../strings'
import { ReadinessBar } from './ReadinessBar'

/** Column Mapping: one card per file and one section per sheet, the readiness and Analyze (spec "Pantalla Column Mapping"). */
export function MappingStep({ detail }: { detail: ImportDetail }) {
  return (
    <div className="flex flex-col gap-4">
      {detail.files.map((file) => (
        <section key={file.fileId} aria-label={file.fileName} className="flex flex-col gap-2 rounded-md border p-3">
          <h2 className="break-all font-medium">{file.fileName}</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {file.sheets.map((sheet) => (
              <li key={sheet.sheetId}>{sheet.sheetName}</li>
            ))}
          </ul>
        </section>
      ))}
      <ReadinessBar detail={detail} />
      <div>
        <Button disabled>{strings.analyze.button}</Button>
      </div>
    </div>
  )
}
