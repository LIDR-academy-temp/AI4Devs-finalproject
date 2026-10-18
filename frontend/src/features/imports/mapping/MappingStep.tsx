import { useRef } from 'react'
import { useFormContext } from 'react-hook-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/client'
import type { ImportDetail } from '@/lib/api/types'
import { useConfirmMapping, useReloadImport } from '../mutations'
import { useImportAccess } from '../permissions'
import { strings } from '../strings'
import { type MappingValues, toMappingConfirmation, valuesFromDetail } from './mapping-form'
import { ReadinessBar } from './ReadinessBar'
import { SheetCard } from './SheetCard'

/** Column Mapping: one card per file and one section per sheet, the readiness and the confirmation (design D5). */
export function MappingStep({ detail }: { detail: ImportDetail }) {
  const form = useFormContext<MappingValues>()
  const { editable } = useImportAccess(detail.status)
  const confirm = useConfirmMapping(detail.importId)
  const reload = useReloadImport(detail.importId)
  // isPending only changes on the next render: two clicks in the same tick would both pass it.
  const sending = useRef(false)

  const submit = form.handleSubmit(async (values) => {
    if (sending.current) return
    sending.current = true
    try {
      const confirmed = await confirm.mutateAsync(toMappingConfirmation(values, detail))
      form.reset(valuesFromDetail(confirmed))
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) void reload()
    } finally {
      sending.current = false
    }
  })

  const confirmError =
    confirm.error instanceof ApiError && confirm.error.code === 'import_not_editable'
      ? strings.rejections.notEditable(String((confirm.error.details as { status?: string } | undefined)?.status ?? ''))
      : confirm.error instanceof ApiError && confirm.error.status === 400
        ? confirm.error.message
        : confirm.error
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
            <SheetCard key={sheet.sheetId} sheet={sheet} disabled={!editable || confirm.isPending} />
          ))}
        </section>
      ))}
      <ReadinessBar detail={detail} />
      {editable && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => void submit()}
            disabled={!form.formState.isValid || confirm.isPending || detail.files.length === 0}
          >
            {strings.mapping.confirm}
          </Button>
          <Button disabled>{strings.analyze.button}</Button>
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
