import type { ReactNode } from 'react'

export type AlertBannerVariant = 'success' | 'error' | 'warning'

export type AlertBannerProps = {
  variant: AlertBannerVariant
  children: ReactNode
  onDismiss?: () => void
}

const variantClasses: Record<AlertBannerVariant, string> = {
  success: 'border-success bg-success-light text-success',
  error: 'border-danger bg-danger-light text-danger',
  warning: 'border-warning bg-warning-light text-warning',
}

export function AlertBanner({ variant, children, onDismiss }: AlertBannerProps) {
  return (
    <div
      className={`flex min-w-0 items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm ${variantClasses[variant]}`}
      role="alert"
    >
      <div className="min-w-0 break-words">{children}</div>
      {onDismiss && (
        <button
          type="button"
          className="cursor-pointer shrink-0 rounded px-1 text-sm font-medium opacity-80 hover:opacity-100"
          onClick={onDismiss}
          aria-label="Cerrar alerta"
        >
          ×
        </button>
      )}
    </div>
  )
}
