import { useState } from 'react'
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
import { ApiError } from '@/lib/api/client'
import type { ImportDetail } from '@/lib/api/types'
import { useCancelImport, useReloadImport } from './mutations'
import { strings } from './strings'

const s = strings.cancel

/**
 * Cancel import with a confirmation (spec "Cancelación del import desde la pantalla"). The API takes no reason yet
 * (proposal, "Huecos del API"). Escape or the keep button close the dialog without calling the API.
 */
export function CancelImportDialog({
  detail,
  cancellable,
  disabled,
}: {
  detail: ImportDetail
  /** Whether the button is offered; the component stays mounted so its last error remains visible. */
  cancellable: boolean
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const cancel = useCancelImport(detail.importId)
  const reload = useReloadImport(detail.importId)
  const [error, setError] = useState<string | null>(null)

  const confirm = () => {
    setError(null)
    cancel.mutate(undefined, {
      onSuccess: () => setOpen(false),
      onError: (failure) => {
        setOpen(false)
        if (failure instanceof ApiError && failure.code === 'import_not_cancellable') {
          const status = (failure.details as { status?: string } | undefined)?.status ?? ''
          setError(s.notCancellable(status))
          void reload()
        } else {
          setError(s.failed)
        }
      },
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {cancellable && (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={disabled || cancel.isPending}>
              {s.button}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{s.title}</AlertDialogTitle>
              <AlertDialogDescription>{s.body}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{s.keep}</AlertDialogCancel>
              <Button variant="destructive" onClick={confirm} disabled={cancel.isPending}>
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
