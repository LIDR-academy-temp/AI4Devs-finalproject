import { useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMe } from '@/lib/session/me'
import { downloadSettlementExport, type ExportType, type SettlementView } from './contract'
import { BACK_OFFICE_EXPORTS, exportFileName, SETTLEMENT_EXPORTS_AVAILABLE, saveFile } from './exports'
import { strings } from './strings'

const s = strings.summary
const TYPES: ExportType[] = ['summary', 'transactions', 'reserves']

/**
 * The three downloads of the attempt for whoever has reports.view (presentation only: the API answers 403). The links
 * need the Bearer token, so each file is fetched authenticated and saved; downloading changes nothing (design D12).
 */
export function SummaryExports({ view }: { view: SettlementView }) {
  const canDownload = useMe().permissions.includes('reports.view')
  const reasonId = useId()
  const excelId = useId()
  const busy = useRef(new Set<ExportType>())
  // Per button: a download on its way, and the last try that failed.
  const [downloading, setDownloading] = useState<ReadonlySet<ExportType>>(new Set())
  const [failed, setFailed] = useState<ReadonlySet<ExportType>>(new Set())

  if (!canDownload) return null

  const withType = (set: ReadonlySet<ExportType>, type: ExportType) => new Set(set).add(type)
  const withoutType = (set: ReadonlySet<ExportType>, type: ExportType) => {
    const next = new Set(set)
    next.delete(type)
    return next
  }

  async function download(type: ExportType) {
    // One download per button at a time, even with two clicks in the same tick.
    if (busy.current.has(type)) return
    busy.current.add(type)
    setDownloading((set) => withType(set, type))
    setFailed((set) => withoutType(set, type))
    try {
      const file = await downloadSettlementExport(view.batchId, type)
      saveFile(file.blob, file.fileName ?? exportFileName(view, type, file.contentType))
    } catch {
      setFailed((set) => withType(set, type))
    } finally {
      busy.current.delete(type)
      setDownloading((set) => withoutType(set, type))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{s.exports}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <div className="flex flex-wrap gap-2">
          {TYPES.map((type) => (
            <Button
              key={type}
              variant="outline"
              disabled={!SETTLEMENT_EXPORTS_AVAILABLE || downloading.has(type)}
              aria-describedby={
                !SETTLEMENT_EXPORTS_AVAILABLE ? reasonId : BACK_OFFICE_EXPORTS.includes(type) ? excelId : undefined
              }
              onClick={() => void download(type)}
            >
              {s.exportNames[type]}
            </Button>
          ))}
        </div>
        {SETTLEMENT_EXPORTS_AVAILABLE ? (
          <>
            <p className="text-muted-foreground">{s.exportsNote}</p>
            <p id={excelId}>{s.exportsExcel}</p>
          </>
        ) : (
          <p id={reasonId} className="text-muted-foreground">
            {s.exportsUnavailable}
          </p>
        )}
        <div aria-live="polite">{failed.size > 0 && <p className="text-destructive">{s.exportFailed}</p>}</div>
      </CardContent>
    </Card>
  )
}
