import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminMobileCardList } from '../../shared/components/admin'
import { MenuPerfilPermisoMobileCard } from './MenuPerfilPermisoMobileCard'
import type { MenuPerfilPermiso } from './types'

type MenuPerfilPermisosPanelProps = {
  permisos: MenuPerfilPermiso[]
  onChange: (next: MenuPerfilPermiso[]) => void
  disabled?: boolean
  loading?: boolean
}

export function MenuPerfilPermisosPanel({
  permisos,
  onChange,
  disabled,
  loading,
}: MenuPerfilPermisosPanelProps) {
  const [filter, setFilter] = useState('')
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return permisos
    return permisos.filter((p) => p.nombre.toLowerCase().includes(q))
  }, [permisos, filter])

  const assignedCount = permisos.filter((p) => p.asignado).length

  const toggle = (perfilId: number, checked: boolean) => {
    onChange(
      permisos.map((p) =>
        p.perfilId === perfilId ? { ...p, asignado: checked, visible: checked ? p.visible : false } : p,
      ),
    )
  }

  const toggleVisible = (perfilId: number, visible: boolean) => {
    onChange(permisos.map((p) => (p.perfilId === perfilId ? { ...p, visible } : p)))
  }

  const selectAll = () => {
    onChange(permisos.map((p) => ({ ...p, asignado: true, visible: true })))
  }

  const clearAll = () => {
    onChange(permisos.map((p) => ({ ...p, asignado: false, visible: false })))
  }

  if (loading) {
    return <p className="text-muted small mb-0">Cargando perfiles…</p>
  }

  return (
    <div className="cq-admin-menu-perfiles flex min-w-0 flex-col gap-2">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div>
          <h3 className="h6 mb-0">Perfiles con acceso</h3>
          <p className="form-text mb-0">
            {assignedCount} de {permisos.length} asignados ·{' '}
            <Link to="/admin/perfiles" className="text-primary">
              editar por perfil
            </Link>
          </p>
        </div>
        <div className="btn-group btn-group-sm" role="group" aria-label="Acciones rápidas">
          <button type="button" className="btn btn-outline-secondary" disabled={disabled} onClick={selectAll}>
            Todos
          </button>
          <button type="button" className="btn btn-outline-secondary" disabled={disabled} onClick={clearAll}>
            Ninguno
          </button>
        </div>
      </div>

      <input
        type="search"
        className="form-control form-control-sm"
        placeholder="Buscar perfil…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        disabled={disabled}
      />

      <div className="max-h-[min(36vh,320px)] overflow-y-auto rounded border cq-admin-table-pane">
        <table className="table table-sm table-striped mb-0 d-none d-md-table">
          <thead className="sticky top-0 bg-surface">
            <tr>
              <th scope="col">Perfil</th>
              <th scope="col" className="w-24 text-center">
                Asignado
              </th>
              <th scope="col" className="w-24 text-center">
                Visible
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.perfilId}>
                <td className="min-w-0 break-words">{p.nombre}</td>
                <td className="text-center">
                  <input
                    type="checkbox"
                    className="form-check-input cursor-pointer"
                    checked={p.asignado}
                    disabled={disabled}
                    onChange={(e) => toggle(p.perfilId, e.target.checked)}
                    aria-label={`Asignar perfil ${p.nombre}`}
                  />
                </td>
                <td className="text-center">
                  <input
                    type="checkbox"
                    className="form-check-input cursor-pointer"
                    checked={p.visible}
                    disabled={disabled || !p.asignado}
                    onChange={(e) => toggleVisible(p.perfilId, e.target.checked)}
                    aria-label={`Visible para ${p.nombre}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="d-none d-md-block p-3 text-center text-sm text-muted mb-0">No hay perfiles.</p>
        )}
      </div>

      <AdminMobileCardList
        className="d-md-none"
        rows={filtered}
        getRowKey={(p) => p.perfilId}
        emptyMessage="No hay perfiles."
        renderCard={(p) => (
          <MenuPerfilPermisoMobileCard
            permiso={p}
            disabled={disabled}
            onToggleAsignado={toggle}
            onToggleVisible={toggleVisible}
          />
        )}
      />

      <p className="form-text mb-0">
        <strong>Asignado:</strong> el perfil tiene este ítem en su menú. <strong>Visible:</strong> se muestra en el
        sidebar (si está desmarcado, queda oculto pero asignado).
      </p>
    </div>
  )
}
