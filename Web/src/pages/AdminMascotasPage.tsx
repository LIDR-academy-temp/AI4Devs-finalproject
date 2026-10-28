import { useMemo, useState } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import {
  MASCOTAS_PADRON_ACCESSORS,
  MASCOTAS_PADRON_COLUMNS,
} from '../features/admin/mascotas/mascotasPadronTableFilter'
import { usePadronMascotas } from '../features/mascotas/useMascotas'
import { AdminFilterableTable, AdminListToolbar } from '../shared/components/admin'
import { useClientTableFilter } from '../shared/hooks/useClientTableFilter'

export function AdminMascotasPage() {
  const { padron, loading, error, reload } = usePadronMascotas()
  const [dismissedError, setDismissedError] = useState(false)

  const heroStats = useMemo(
    () => [
      { label: 'Mascotas', value: padron.length },
      {
        label: 'Vacunas al día',
        value: padron.filter((m) => m.vacunasAlDia === true).length,
      },
      {
        label: 'Pendientes',
        value: padron.filter((m) => m.vacunasAlDia === false).length,
      },
    ],
    [padron],
  )

  const {
    filteredRows,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    onColumnFilterChange,
    filteredCount,
    totalCount,
  } = useClientTableFilter(padron, MASCOTAS_PADRON_COLUMNS, MASCOTAS_PADRON_ACCESSORS)

  return (
    <div className="cq-admin-page container-fluid py-4">
      {error && !dismissedError && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setDismissedError(true)} />
        </div>
      )}

      <AdminListToolbar
        title="Mascotas"
        metrics={heroStats}
        primaryAction={{
          label: 'Actualizar',
          iconClass: 'mdi mdi-refresh',
          onClick: () => void reload(),
        }}
      />

      <div className="card">
        <div className="card-body pt-3">
          {loading && (
            <div className="placeholder-glow" aria-label="Cargando mascotas">
              <span className="placeholder col-12 mb-2" />
            </div>
          )}
          {!loading && padron.length === 0 && (
            <div className="cq-empty-state">
              <i className="mdi mdi-paw cq-empty-icon" />
              <p className="cq-empty-title">Sin mascotas</p>
              <p className="text-muted">No hay registros en el padrón.</p>
            </div>
          )}
          {!loading && padron.length > 0 && (
            <AdminFilterableTable
              columns={MASCOTAS_PADRON_COLUMNS}
              columnFilters={columnFilters}
              onColumnFilterChange={onColumnFilterChange}
              globalSearch={globalSearch}
              onGlobalSearchChange={setGlobalSearch}
              filteredCount={filteredCount}
              totalCount={totalCount}
            >
              {filteredRows.map((m) => (
                <tr key={m.mascotaId}>
                  <td className="font-weight-bold min-w-0 text-break">{m.nombreMascota}</td>
                  <td className="min-w-0 text-break">
                    {[m.tipoMascota, m.razaMascota ?? m.razaLibre].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="min-w-0 text-break">{m.nombreUsuario ?? '—'}</td>
                  <td>{m.numeroCasa ?? '—'}</td>
                  <td>
                    {m.vacunasAlDia === undefined ? (
                      '—'
                    ) : (
                      <span className={`badge ${m.vacunasAlDia ? 'bg-success' : 'bg-warning text-dark'}`}>
                        {m.vacunasAlDia ? 'Al día' : 'Pendiente'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </AdminFilterableTable>
          )}
        </div>
      </div>
    </div>
  )
}
