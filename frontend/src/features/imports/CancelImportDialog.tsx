import { useId, useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'
import type { ImportDetail } from '@/lib/api/types'
import { useCancelImport, useReloadImport } from './mutations'
import { strings } from './strings'

const s = strings.cancel
/** The reason is audited with the limit of the API (ReasonRequest: 1 to 500 characters once trimmed). */
const MAX_REASON = 500

/**
 * Cancel import with a required reason (spec "Cancelación del import desde la pantalla", #47): the reason starts
 * empty each time the dialog opens and travels without the spaces of its ends. Escape or the keep button close the
 * dialog without calling the API. The import workspace, Analysis & Validations and In Progress use it.
 */
export function CancelImportDialog({
  detail,
  cancellable,
  disabled,
  describedBy,
  label = s.button,
  onCancelled,
}: {
  /** The import to cancel; a row of In Progress is enough (import-in-progress D6). */
  detail: Pick<ImportDetail, 'importId' | 'accountId' | 'status'>
  /** Whether the button is offered; the component stays mounted so its last error remains visible. */
  cancellable: boolean
  disabled: boolean
  /** Id of the text that says why the button waits, while it is disabled. */
  describedBy?: string
  /** Text of the button: Cancel and reprocess in the decision of Analysis & Validations (web-validations D9). */
  label?: string
  /**
   * Called once the import is cancelled, or with its status when it is no longer cancellable: In Progress asks its
   * list again and says so itself, since the row (and this component) leaves the list.
   */
  onCancelled?: (notCancellableStatus?: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const fieldId = useId()
  const cancel = useCancelImport(detail.importId)
  const reload = useReloadImport(detail.importId)
  const [error, setError] = useState<string | null>(null)
  const reason = text.trim()

  const onOpenChange = (next: boolean) => {
    if (next) setText('')
    setOpen(next)
  }

  const confirm = () => {
    if (reason === '') return
    setError(null)
    cancel.mutate(reason, {
      onSuccess: () => {
        setOpen(false)
        onCancelled?.()
      },
      onError: (failure) => {
        setOpen(false)
        if (failure instanceof ApiError && failure.code === 'import_not_cancellable') {
          const status = (failure.details as { status?: string } | undefined)?.status ?? ''
          setError(s.notCancellable(status))
          void reload()
          onCancelled?.(status)
        } else {
          setError(s.failed)
        }
      },
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {cancellable && (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={disabled || cancel.isPending} aria-describedby={describedBy}>
              {label}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{s.title}</AlertDialogTitle>
              <AlertDialogDescription>{s.body}</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-1">
              <Label htmlFor={fieldId}>{s.reason}</Label>
              <Textarea
                id={fieldId}
                value={text}
                maxLength={MAX_REASON}
                rows={3}
                required
                onChange={(event) => setText(event.target.value)}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>{s.keep}</AlertDialogCancel>
              <Button variant="destructive" onClick={confirm} disabled={cancel.isPending || reason === ''}>
                {s.confirm}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
