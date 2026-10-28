import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import { usePerfilesAdmin } from '../features/navegacion/usePerfilesAdmin'
import type { PerfilListItem } from '../features/navegacion/types'
import { PerfilAdminMobileCard } from '../features/navegacion/PerfilAdminMobileCard'
import { AdminFilterableTable, AdminListToolbar, AdminMobileCardList } from '../shared/components/admin'
import { useClientTableFilter } from '../shared/hooks/useClientTableFilter'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import type { TableFilterAccessors, TableFilterColumn } from '../shared/types/tableFilter'

const COLUMNS: TableFilterColumn[] = [
  { key: 'nombre', header: 'Perfil', filterType: 'text' },
  { key: 'descripcion', header: 'Descripción', filterType: 'text' },
  { key: 'admin', header: 'Admin', filterType: 'none' },
  { key: 'acciones', header: '', filterType: 'none' },
]

const ACCESSORS: TableFilterAccessors<PerfilListItem> = {
  getRowSearchText: (row) => [row.nombre, row.descripcion ?? ''].join(' '),
  getColumnValue: (row, key) => {
    if (key === 'nombre') return row.nombre
    if (key === 'descripcion') return row.descripcion ?? ''
    if (key === 'admin') return row.bAdministrador ? 'Sí' : 'No'
    return ''
  },
}

export function AdminPerfilesPage() {
  const navigate = useNavigate()
  const { perfiles, loading, error } = usePerfilesAdmin()
  useQueryErrorToast(error)
  const columns = useMemo(() => COLUMNS, [])
  const accessors = useMemo(() => ACCESSORS, [])

  const {
    filteredRows,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    onColumnFilterChange,
    filteredCount,
    totalCount,
  } = useClientTableFilter(perfiles, columns, accessors)

  return (
    <div className="cq-admin-page container-fluid py-4">
      <AdminListToolbar
        title="Perfiles"
        metrics={[{ label: 'Perfiles', value: perfiles.length }]}
      />

      <div className="card">
        <div className="card-body pt-3">
          {loading && <p className="text-muted">Cargando…</p>}
          {!loading && perfiles.length === 0 && (
            <p className="text-muted">No hay perfiles o no se pudo cargar el listado.</p>
          )}
          {!loading && perfiles.length > 0 && (
            <>
            <AdminFilterableTable
              columns={columns}
              columnFilters={columnFilters}
              onColumnFilterChange={onColumnFilterChange}
              globalSearch={globalSearch}
              onGlobalSearchChange={setGlobalSearch}
              filteredCount={filteredCount}
              totalCount={totalCount}
            >
              {filteredRows.map((row) => (
                <tr key={row.perfilId}>
                  <td className="min-w-0 break-words font-weight-bold">{row.nombre}</td>
                  <td className="min-w-0 break-words">{row.descripcion ?? '—'}</td>
                  <td>{row.bAdministrador ? 'Sí' : 'No'}</td>
                  <td>
                    <Link
                      to={`/admin/perfiles/${row.perfilId}/permisos`}
                      className="btn btn-sm btn-outline-primary cursor-pointer"
                    >
                      Permisos menú
                    </Link>
                  </td>
                </tr>
              ))}
            </AdminFilterableTable>
            <AdminMobileCardList
              rows={filteredRows}
              getRowKey={(row) => row.perfilId}
              renderCard={(row) => (
                <PerfilAdminMobileCard
                  perfil={row}
                  onPermisos={(id) => navigate(`/admin/perfiles/${id}/permisos`)}
                />
              )}
            />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
