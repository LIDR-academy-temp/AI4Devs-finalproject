import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../features/auth/AuthContext'
import { NotificacionesBandeja } from '../features/notifications/NotificacionesBandeja'
import { fetchNotificaciones, marcarNotificacionLeida } from '../features/notifications/notifications.api'
import {
  PortalListPage,
  PortalListSection,
  PortalStat,
  PortalStatStrip,
  portalListCountDescription,
} from '../shared/components/admin'
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

  const count = items.length

  return (
    <PortalListPage
      width="3xl"
      header={{
        title: 'Notificaciones',
        description: portalListCountDescription(
          count,
          'aviso',
          'avisos',
          'Avisos del condominio y del portal.',
        ),
      }}
      loading={loading}
      loadingMessage="Cargando notificaciones…"
      error={error}
      onRetry={() => void load()}
      empty={
        !loading && !error && count === 0
          ? { title: 'Sin notificaciones.', description: 'Cuando haya novedades, aparecerán aquí.' }
          : undefined
      }
    >
      {count > 0 ? (
        <>
          <PortalStatStrip>
            <PortalStat label="Sin leer" value={totalNoLeidas} valueClassName="text-primary" />
            <PortalStat label="En esta bandeja" value={count} />
          </PortalStatStrip>
          <PortalListSection title="Listado">
            <NotificacionesBandeja
              items={items}
              markingId={markingId}
              onMarcarLeida={(id) => void handleMarcarLeida(id)}
            />
          </PortalListSection>
        </>
      ) : null}
    </PortalListPage>
  )
}
