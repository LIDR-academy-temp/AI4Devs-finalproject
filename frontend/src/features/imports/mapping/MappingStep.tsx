import { useRef, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/client'
import type { ImportDetail } from '@/lib/api/types'
import type { Analysis } from '../analyze'
import { useConfirmMapping, useReloadImport } from '../mutations'
import { useImportAccess } from '../permissions'
import { strings } from '../strings'
import { type MappingValues, toMappingConfirmation, valuesFromDetail } from './mapping-form'
import { ReadinessBar, unconfirmedSheets } from './ReadinessBar'
import { SheetCard } from './SheetCard'

/** Column Mapping: one card per file and one section per sheet, the readiness and the confirmation (design D5). */
export function MappingStep({ detail, analysis }: { detail: ImportDetail; analysis: Analysis }) {
  const form = useFormContext<MappingValues>()
  const { editable } = useImportAccess(detail.status)
  const confirm = useConfirmMapping(detail.importId)
  const reload = useReloadImport(detail.importId)
  // isPending only changes on the next render: two clicks in the same tick would both pass it.
  const sending = useRef(false)
  // A failure outside the API (the body could not be built) leaves no error in the mutation.
  const [failed, setFailed] = useState(false)

  const submit = form.handleSubmit(async (values) => {
    if (sending.current) return
    sending.current = true
    setFailed(false)
    try {
      const confirmed = await confirm.mutateAsync(toMappingConfirmation(values, detail))
      form.reset(valuesFromDetail(confirmed))
    } catch (error) {
      if (!(error instanceof ApiError)) setFailed(true)
      else if (error.status === 409) void reload()
    } finally {
      sending.current = false
    }
  })

  const dirty = form.formState.isDirty
  const missing = analysis.missing ?? detail.readiness.missing
  const confirmFirst = detail.status !== 'mapped' || dirty || unconfirmedSheets(detail).length > 0
  const canAnalyze = !confirmFirst && missing.length === 0 && !analysis.running && !confirm.isPending
  const whyNot = analysis.running
    ? null
    : confirmFirst
      ? strings.analyze.confirmFirst
      : missing.length > 0
        ? strings.analyze.resolveMissing
        : null

  const confirmError =
    confirm.error instanceof ApiError && confirm.error.code === 'import_not_editable'
      ? strings.rejections.notEditable(String((confirm.error.details as { status?: string } | undefined)?.status ?? ''))
      : confirm.error instanceof ApiError && confirm.error.status === 400
        ? confirm.error.message
        : confirm.error || failed
          ? strings.mapping.confirmFailed
          : null

  return (
    <div className="flex flex-col gap-4">
      {detail.files.map((file) => (
        <section
          key={file.fileId}
          aria-label={file.fileName}
          className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3"
        >
          <h2 className="break-all font-medium">{file.fileName}</h2>
          {file.sheets.map((sheet) => (
            <SheetCard
              key={sheet.sheetId}
              sheet={sheet}
              editable={editable}
              disabled={!editable || confirm.isPending || analysis.running}
            />
          ))}
        </section>
      ))}
      <ReadinessBar detail={detail} missing={missing} />
      {editable && (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => void submit()}
              disabled={!form.formState.isValid || confirm.isPending || analysis.running || detail.files.length === 0}
            >
              {strings.mapping.confirm}
            </Button>
            <Button onClick={() => void analysis.analyze()} disabled={!canAnalyze}>
              {strings.analyze.button}
            </Button>
          </div>
          {whyNot && <p className="text-sm text-muted-foreground">{whyNot}</p>}
          <p aria-live="polite" className="text-sm">
            {analysis.running ? strings.analyze.running : ''}
          </p>
          {analysis.error && <p className="text-sm text-destructive">{analysis.error}</p>}
        </div>
      )}
      {confirmError && (
        <Alert variant="destructive">
          <AlertDescription>{confirmError}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
