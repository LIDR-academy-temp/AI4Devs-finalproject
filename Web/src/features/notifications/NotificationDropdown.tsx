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
    return <p className="p-3 text-sm text-neutral">Cargando…</p>
  }

  if (error) {
    return <p className="p-3 text-sm text-neutral" role="status">No se pudieron cargar.</p>
  }

  if (items.length === 0) {
    return <p className="p-3 text-sm text-neutral">Sin notificaciones.</p>
  }

  const listClass = 'max-h-80 divide-y divide-neutral-100 overflow-y-auto'

  return (
    <ul className={listClass}>
      {items.map((n) => (
        <li
          key={n.notificacionId}
          className={`p-3 text-sm ${!n.leida ? 'border-l-2 border-primary bg-primary-50' : ''}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p
                className={`break-words font-medium ${n.leida ? 'text-neutral' : 'text-primary-dark'}`}
              >
                {n.titulo}
              </p>
              <p className="break-words text-neutral">{n.mensaje}</p>
            </div>
            {!n.leida && (
              <button
                type="button"
                className="shrink-0 cursor-pointer text-xs text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                disabled={markingId === n.notificacionId}
                onClick={() => onMarcarLeida(n.notificacionId)}
              >
                Marcar leída
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
