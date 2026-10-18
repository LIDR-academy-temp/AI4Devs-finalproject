import { useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/client'
import type { ImportDetail } from '@/lib/api/types'
import { useRemoveFile } from '../mutations'
import { useImportAccess } from '../permissions'
import { importKey } from '../queries'
import { strings } from '../strings'
import { DropZone } from './DropZone'
import { FileList } from './FileList'
import { useQueueSnapshot, useUploadQueue } from './UploadQueueProvider'
import { rejectionText } from './upload-queue'

/** Files of the import: add and remove while it is uploaded or mapped (spec "Pantalla Upload Files"). */
export function FilesStep({
  detail,
  busy = false,
  onContinue,
}: {
  detail: ImportDetail
  busy?: boolean
  onContinue: () => void
}) {
  const queryClient = useQueryClient()
  const queue = useUploadQueue()
  useQueueSnapshot(queue)
  const batch = queue.forImport(detail.importId)
  const { canProcess, editable } = useImportAccess(detail.status)
  const remove = useRemoveFile(detail.importId)
  const uploading = batch?.entries.some((e) => e.state !== 'rejected') ?? false

  const removeError =
    remove.error instanceof ApiError && remove.error.code === 'import_not_editable'
      ? rejectionText(remove.error)
      : remove.error
        ? strings.rejections.failed
        : null

  return (
    <div className="flex flex-col gap-4">
      <FileList
        files={detail.files}
        entries={batch?.entries ?? []}
        onRemove={
          editable
            ? (file) =>
                remove.mutate(file.fileId, {
                  onError: (error) => {
                    if (error instanceof ApiError && error.status === 409) {
                      void queryClient.invalidateQueries({ queryKey: importKey(detail.importId), exact: true })
                    }
                  },
                })
            : undefined
        }
        removeDisabled={busy || uploading || remove.isPending}
      />
      {detail.files.length === 0 && !uploading && (
        <p className="text-sm text-muted-foreground">{strings.files.empty}</p>
      )}
      {removeError && (
        <Alert variant="destructive">
          <AlertDescription>{removeError}</AlertDescription>
        </Alert>
      )}
      {batch?.selectionError && <p className="text-sm text-destructive">{batch.selectionError}</p>}
      {editable ? (
        <DropZone
          disabled={busy || uploading || remove.isPending}
          hint={strings.upload.hint}
          onFiles={(files) => queue.enqueue({ accountId: detail.accountId, importId: detail.importId }, files)}
        />
      ) : (
        canProcess && (
          <p className="text-sm text-muted-foreground">
            {detail.analysis !== null ? strings.files.afterAnalysis : strings.files.readOnly}
          </p>
        )
      )}
      {editable && detail.files.length > 0 && (
        <div>
          <Button onClick={onContinue}>{strings.files.continue}</Button>
        </div>
      )}
    </div>
  )
}
