import type { PerfilMenuPermiso } from './types'

type Props = {
  permiso: PerfilMenuPermiso
  disabled?: boolean
  onToggleAsignado: (menuId: number, checked: boolean) => void
  onToggleVisible: (menuId: number, visible: boolean) => void
}

export function PermisoMenuAdminMobileCard({
  permiso,
  disabled,
  onToggleAsignado,
  onToggleVisible,
}: Props) {
  return (
    <article className="cq-admin-mobile-card card mb-2 shadow-sm">
      <div className="card-body py-3 min-w-0">
        <div className="fw-semibold text-break mb-2">{permiso.titulo}</div>
        <div className="d-flex flex-wrap gap-3">
          <label className="form-check mb-0 cursor-pointer">
            <input
              type="checkbox"
              className="form-check-input cursor-pointer"
              checked={permiso.asignado}
              disabled={disabled}
              onChange={(e) => onToggleAsignado(permiso.menuId, e.target.checked)}
            />
            <span className="form-check-label ms-1">Asignado</span>
          </label>
          <label className="form-check mb-0 cursor-pointer">
            <input
              type="checkbox"
              className="form-check-input cursor-pointer"
              checked={permiso.visible}
              disabled={disabled || !permiso.asignado}
              onChange={(e) => onToggleVisible(permiso.menuId, e.target.checked)}
            />
            <span className="form-check-label ms-1">Visible</span>
          </label>
        </div>
      </div>
    </article>
  )
}
