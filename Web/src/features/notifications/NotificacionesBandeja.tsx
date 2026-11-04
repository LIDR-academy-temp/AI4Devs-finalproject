import { Bell } from 'lucide-react'
import type { NotificacionItem } from '../../shared/types/notifications'
import {
  PortalEntityIcon,
  PortalEntityMain,
  PortalEntityMeta,
  PortalEntityTitle,
  PortalRowActionButton,
  PortalRowActions,
  PortalRowList,
  PortalRowListItem,
} from '../../shared/components/admin'

type Props = {
  items: NotificacionItem[]
  markingId: number | null
  onMarcarLeida: (id: number) => void
}

function formatNotificacionFecha(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function NotificacionesBandeja({ items, markingId, onMarcarLeida }: Props) {
  return (
    <PortalRowList>
      {items.map((n) => {
        const metaParts = [formatNotificacionFecha(n.fechaCreacion), n.tipo].filter(Boolean).join(' · ')
        return (
          <PortalRowListItem key={n.notificacionId} data-unread={n.leida ? 'false' : 'true'}>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <PortalEntityIcon>
                  <Bell
                    className={`h-5 w-5 ${n.leida ? 'text-neutral-300' : 'text-primary'}`}
                    aria-hidden
                  />
                </PortalEntityIcon>
                <PortalEntityMain>
                  <PortalEntityTitle>{n.titulo}</PortalEntityTitle>
                  <PortalEntityMeta>{n.mensaje}</PortalEntityMeta>
                  {metaParts ? <PortalEntityMeta>{metaParts}</PortalEntityMeta> : null}
                </PortalEntityMain>
              </div>
              <PortalRowActions className="self-start sm:self-center">
                {!n.leida ? (
                  <PortalRowActionButton
                    disabled={markingId === n.notificacionId}
                    onClick={() => onMarcarLeida(n.notificacionId)}
                  >
                    Marcar leída
                  </PortalRowActionButton>
                ) : (
                  <span className="cq-portal-badge bg-neutral-100 text-neutral-700 border border-neutral-200">
                    Leída
                  </span>
                )}
              </PortalRowActions>
            </div>
          </PortalRowListItem>
        )
      })}
    </PortalRowList>
  )
}
