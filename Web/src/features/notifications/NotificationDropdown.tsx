import { NotificacionesBandeja } from './NotificacionesBandeja'
import type { NotificacionItem } from '../../shared/types/notifications'

type Props = {
  items: NotificacionItem[]
  loading: boolean
  error: string | null
  onMarcarLeida: (id: number) => void
  markingId: number | null
}

export function NotificationDropdown({
  items,
  loading,
  error,
  onMarcarLeida,
  markingId,
}: Props) {
  if (loading) {
    return <p className="px-4 py-3 text-sm text-neutral">Cargando…</p>
  }

  if (error) {
    return (
      <p className="px-4 py-3 text-sm text-neutral" role="status">
        No se pudieron cargar.
      </p>
    )
  }

  if (items.length === 0) {
    return <p className="px-4 py-3 text-sm text-neutral">Sin notificaciones.</p>
  }

  return (
    <NotificacionesBandeja
      variant="dropdown"
      items={items}
      markingId={markingId}
      onMarcarLeida={onMarcarLeida}
    />
  )
}
