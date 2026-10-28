import { Bell } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { fetchNotificaciones, marcarNotificacionLeida } from './notifications.api'
import { useQueryErrorToast } from '../../shared/hooks/useQueryErrorToast'
import { NotificationDropdown } from './NotificationDropdown'
import type { NotificacionItem } from '../../shared/types/notifications'

export function NotificationBell() {
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificacionItem[]>([])
  const [totalNoLeidas, setTotalNoLeidas] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [markingId, setMarkingId] = useState<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  useQueryErrorToast(error)

  const load = useCallback(async () => {
    if (!session?.token) return
    setLoading(true)
    setError(null)
    const { data, problem, status } = await fetchNotificaciones(session.token, 1, 20)
    setLoading(false)
    if (status !== 200 || !data) {
      setError(problem?.detail ?? 'No se pudieron cargar las notificaciones')
      return
    }
    setItems(data.items)
    setTotalNoLeidas(data.totalNoLeidas)
  }, [session?.token])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const handleMarcarLeida = async (id: number) => {
    if (!session?.token) return
    setMarkingId(id)
    const { status } = await marcarNotificacionLeida(session.token, id)
    setMarkingId(null)
    if (status === 204) {
      setItems((prev) =>
        prev.map((n) => (n.notificacionId === id ? { ...n, leida: true } : n)),
      )
      setTotalNoLeidas((c) => Math.max(0, c - 1))
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        className="relative flex cursor-pointer items-center justify-center rounded-lg p-2 text-white/85 ring-1 ring-transparent transition-colors hover:bg-white/10 hover:text-white hover:ring-white/10"
        aria-label="Notificaciones"
        onClick={() => {
          setOpen((v) => !v)
          if (!open) void load()
        }}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {totalNoLeidas > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-xs font-medium text-white"
            data-testid="notif-badge"
          >
            {totalNoLeidas > 99 ? '99+' : totalNoLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-80 rounded-lg border border-neutral-100 bg-surface-alt shadow-xl">
          <p className="border-b border-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-900">Notificaciones</p>
          <NotificationDropdown
            items={items}
            loading={loading}
            error={error}
            markingId={markingId}
            onMarcarLeida={(id) => void handleMarcarLeida(id)}
          />
        </div>
      )}
    </div>
  )
}
