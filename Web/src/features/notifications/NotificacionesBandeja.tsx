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
  /** `dropdown`: campana header — compacto, sin icono por fila */
  variant?: 'page' | 'dropdown'
}

function formatNotificacionFecha(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function NotificacionesBandeja({
  items,
  markingId,
  onMarcarLeida,
  variant = 'page',
}: Props) {
  const isDropdown = variant === 'dropdown'
  const listClass = isDropdown ? 'cq-portal-row-list--compact max-h-80 overflow-y-auto' : ''

  return (
    <PortalRowList className={listClass}>
      {items.map((n) => {
        const metaParts = [formatNotificacionFecha(n.fechaCreacion), n.tipo].filter(Boolean).join(' · ')
        const action = !n.leida ? (
          <PortalRowActionButton
            disabled={markingId === n.notificacionId}
            onClick={() => onMarcarLeida(n.notificacionId)}
          >
            Marcar leída
          </PortalRowActionButton>
        ) : (
          <span className="cq-portal-badge border border-neutral-200 bg-neutral-100 text-neutral-700">
            Leída
          </span>
        )

        return (
          <PortalRowListItem key={n.notificacionId} data-unread={n.leida ? 'false' : 'true'}>
            {isDropdown ? (
              <div className="flex w-full min-w-0 flex-col gap-2">
                <PortalEntityMain>
                  <PortalEntityTitle>{n.titulo}</PortalEntityTitle>
                  <p className="cq-portal-entity-meta line-clamp-2 break-words">{n.mensaje}</p>
                </PortalEntityMain>
                <div className="flex min-w-0 items-center justify-between gap-2">
                  {metaParts ? (
                    <span className="min-w-0 truncate text-xs text-neutral">{metaParts}</span>
                  ) : (
                    <span />
                  )}
                  <PortalRowActions className="shrink-0">{action}</PortalRowActions>
                </div>
              </div>
            ) : (
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
                <PortalRowActions className="self-start sm:self-center">{action}</PortalRowActions>
              </div>
            )}
          </PortalRowListItem>
        )
      })}
    </PortalRowList>
  )
}
