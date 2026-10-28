import { useEffect, useRef } from 'react'
import { useToast } from '../toast/ToastContext'

/** Muestra error de query de listado una vez por mensaje distinto (no banner de página). */
export function useQueryErrorToast(error: string | null | undefined, enabled = true) {
  const toast = useToast()
  const lastRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    if (!error) {
      lastRef.current = null
      return
    }
    if (lastRef.current === error) return
    lastRef.current = error
    toast.error(error)
  }, [error, enabled, toast])
}
