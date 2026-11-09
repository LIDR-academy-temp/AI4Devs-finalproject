import { FormModal } from './FormModal'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmClass =
    variant === 'danger'
      ? 'cursor-pointer rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60'
      : 'cursor-pointer rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60'

  return (
    <FormModal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            className="cursor-pointer rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 hover:bg-surface-alt"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button type="button" className={confirmClass} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="break-words text-sm text-neutral-700">{message}</p>
    </FormModal>
  )
}
