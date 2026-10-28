import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type ToastVariant = 'info' | 'success' | 'error'

export type ToastOptions = {
  variant?: ToastVariant
  durationMs?: number
}

type ToastRecord = {
  id: string
  message: string
  variant: ToastVariant
}

type ToastApi = {
  show: (message: string, options?: ToastOptions) => void
  success: (message: string, options?: Omit<ToastOptions, 'variant'>) => void
  error: (message: string, options?: Omit<ToastOptions, 'variant'>) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const DEFAULT_DURATION = 4500

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    const t = timersRef.current.get(id)
    if (t) {
      clearTimeout(t)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const show = useCallback(
    (message: string, options?: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const variant = options?.variant ?? 'info'
      const duration = options?.durationMs ?? DEFAULT_DURATION
      setToasts((prev) => [...prev, { id, message, variant }])
      const timer = setTimeout(() => dismiss(id), duration)
      timersRef.current.set(id, timer)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message, options) => show(message, { ...options, variant: 'success' }),
      error: (message, options) => show(message, { ...options, variant: 'error' }),
      dismiss,
    }),
    [dismiss, show],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex max-w-md items-start gap-2 rounded-xl px-4 py-3 text-sm shadow-lg animate-[slideInDown_150ms_ease-out] motion-reduce:animate-none ${
              t.variant === 'success'
                ? 'bg-success-light text-primary-dark ring-1 ring-success/30'
                : t.variant === 'error'
                  ? 'bg-danger-light text-danger ring-1 ring-danger/25'
                  : 'bg-surface-alt text-neutral-900 ring-1 ring-neutral-100'
            }`}
          >
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              className="cursor-pointer rounded px-1 text-xs opacity-70 hover:opacity-100"
              aria-label="Cerrar aviso"
              onClick={() => dismiss(t.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}
