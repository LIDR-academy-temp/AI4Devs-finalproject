import { useMemo, useState } from 'react'
import { PermisoMenuAdminMobileCard } from './PermisoMenuAdminMobileCard'
import { AdminMobileCardList } from '../../shared/components/admin'
import type { PerfilMenuPermiso } from './types'

type PerfilPermisosPanelProps = {
  permisos: PerfilMenuPermiso[]
  onChange: (next: PerfilMenuPermiso[]) => void
  disabled?: boolean
}

export function PerfilPermisosPanel({ permisos, onChange, disabled }: PerfilPermisosPanelProps) {
  const [filter, setFilter] = useState('')
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return permisos
    return permisos.filter((p) => p.titulo.toLowerCase().includes(q))
  }, [permisos, filter])

  const toggle = (menuId: number, checked: boolean) => {
    onChange(
      permisos.map((p) =>
        p.menuId === menuId ? { ...p, asignado: checked, visible: checked ? p.visible : false } : p,
      ),
    )
  }

  const toggleVisible = (menuId: number, visible: boolean) => {
    onChange(permisos.map((p) => (p.menuId === menuId ? { ...p, visible } : p)))
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <input
        type="search"
        className="form-control"
        placeholder="Buscar menú…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        disabled={disabled}
      />
      <div className="max-h-[min(60vh,480px)] overflow-y-auto rounded-lg border border-border cq-admin-table-pane">
        <table className="table table-sm mb-0">
          <thead className="sticky top-0 bg-surface">
            <tr>
              <th scope="col">Menú</th>
              <th scope="col" className="w-24 text-center">Asignado</th>
              <th scope="col" className="w-24 text-center">Visible</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.menuId}>
                <td className="min-w-0 break-words">{p.titulo}</td>
                <td className="text-center">
                  <input
                    type="checkbox"
                    className="form-check-input cursor-pointer"
                    checked={p.asignado}
                    disabled={disabled}
                    onChange={(e) => toggle(p.menuId, e.target.checked)}
                    aria-label={`Asignar ${p.titulo}`}
                  />
                </td>
                <td className="text-center">
                  <input
                    type="checkbox"
                    className="form-check-input cursor-pointer"
                    checked={p.visible}
                    disabled={disabled || !p.asignado}
                    onChange={(e) => toggleVisible(p.menuId, e.target.checked)}
                    aria-label={`Visible ${p.titulo}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="d-none d-md-block p-4 text-center text-sm text-muted">No hay menús para mostrar.</p>
        )}
      </div>
      <AdminMobileCardList
        rows={filtered}
        getRowKey={(p) => p.menuId}
        emptyMessage="No hay menús para mostrar."
        renderCard={(p) => (
          <PermisoMenuAdminMobileCard
            permiso={p}
            disabled={disabled}
            onToggleAsignado={toggle}
            onToggleVisible={toggleVisible}
          />
        )}
      />
    </div>
  )
}
