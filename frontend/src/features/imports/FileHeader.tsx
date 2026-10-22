import { FileSpreadsheet } from 'lucide-react'
import type { ReactNode } from 'react'
import { strings } from './strings'

/**
 * The header of a file block in Files and Mapping (design D5): icon, name in bold wrapped where it does not fit, and
 * its number of sheets. In Mapping the name is the heading of the file's section.
 */
export function FileHeader({
  fileName,
  sheetCount,
  toneClass,
  heading = false,
  children,
}: {
  fileName: string
  sheetCount: number
  toneClass: string
  heading?: boolean
  /** Actions of the file, at the end of the header. */
  children?: ReactNode
}) {
  const Name = heading ? 'h2' : 'span'
  return (
    <div className={`flex items-center gap-2 rounded-md px-3 py-2 ${toneClass}`}>
      <FileSpreadsheet aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <Name className="min-w-0 font-semibold [overflow-wrap:anywhere]">{fileName}</Name>
      <span className="shrink-0 text-sm text-muted-foreground">{strings.files.sheets(sheetCount)}</span>
      {children && <div className="ml-auto shrink-0">{children}</div>}
    </div>
  )
}
