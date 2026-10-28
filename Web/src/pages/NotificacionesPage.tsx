import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../features/auth/AuthContext'
import { NotificationDropdown } from '../features/notifications/NotificationDropdown'
import { fetchNotificaciones, marcarNotificacionLeida } from '../features/notifications/notifications.api'
import { EmptyState, PageHeader } from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import type { NotificacionItem } from '../shared/types/notifications'

export function NotificacionesPage() {
  const { session } = useAuth()
  const [items, setItems] = useState<NotificacionItem[]>([])
  const [totalNoLeidas, setTotalNoLeidas] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markingId, setMarkingId] = useState<number | null>(null)
  useQueryErrorToast(error)

  const load = useCallback(async () => {
    if (!session?.token) return
    setLoading(true)
    setError(null)
    const { data, problem, status } = await fetchNotificaciones(session.token, 1, 50)
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
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <PageHeader
        title="Notificaciones"
        description={
          totalNoLeidas > 0
            ? `${totalNoLeidas} sin leer`
            : 'Avisos del condominio y del portal.'
        }
      />

      <section
        className="rounded-lg border border-neutral-100 bg-surface-alt shadow-sm"
        aria-labelledby="notif-bandeja-heading"
      >
        <h2 id="notif-bandeja-heading" className="sr-only">
          Bandeja de notificaciones
        </h2>
        {loading && <p className="p-4 text-sm text-neutral">Cargando…</p>}
        {error && !loading && (
          <div className="p-4">
            <p className="text-sm text-neutral" role="status">
              No se pudieron cargar las notificaciones.
            </p>
            <button
              type="button"
              className="mt-2 cursor-pointer text-sm text-primary underline"
              onClick={() => void load()}
            >
              Reintentar
            </button>
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <EmptyState title="Sin notificaciones." />
        )}
        {!loading && !error && items.length > 0 && (
          <NotificationDropdown
            items={items}
            loading={false}
            error={null}
            markingId={markingId}
            onMarcarLeida={(id) => void handleMarcarLeida(id)}
          />
        )}
      </section>
    </main>
  )
}
