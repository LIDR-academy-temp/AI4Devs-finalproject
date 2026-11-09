import { useEffect, useId, useRef, type ReactNode } from 'react'

export type FormModalProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Si no se pasa, se genera con useId para aria-labelledby */
  titleId?: string
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function FormModal({ open, title, onClose, children, footer, titleId }: FormModalProps) {
  const generatedId = useId()
  const headingId = titleId ?? `${generatedId}-title`
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return

    const panel = panelRef.current
    const previouslyFocused = document.activeElement as HTMLElement | null
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !panel) return

      const focusables = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (focusables.length === 0) return

      const firstEl = focusables[0]
      const lastEl = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-neutral-100 bg-surface-alt p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={headingId} className="text-lg font-semibold text-primary-dark">
          {title}
        </h2>
        <div className="mt-4 min-w-0">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
