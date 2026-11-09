import { formatFecha, formatMxn, formatPeriodo } from '../../finanzas/format'
import { AdminFilterableTable, AdminMobileCardList } from '../../../shared/components/admin'
import { useClientTableFilter } from '../../../shared/hooks/useClientTableFilter'
import type { CuotaEstado } from '../../../shared/types/finanzas'
import { CuotaAdminMobileCard } from './CuotaAdminMobileCard'
import { CUOTAS_ADMIN_ACCESSORS, CUOTAS_ADMIN_COLUMNS } from './cuotasAdminTableFilter'
import { cuotaMontoTotal } from './cuotaMontoUtils'

const estadoBadgeClass: Record<string, string> = {
  Pagada: 'badge bg-success',
  Pendiente: 'badge bg-warning text-dark',
  Vencida: 'badge bg-danger',
}

type Props = {
  cuotas: CuotaEstado[]
  onRegistrarPago?: (c: CuotaEstado) => void
}

export function CuotasAdminTable({ cuotas, onRegistrarPago }: Props) {
  const {
    filteredRows,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    onColumnFilterChange,
    filteredCount,
    totalCount,
  } = useClientTableFilter(cuotas, CUOTAS_ADMIN_COLUMNS, CUOTAS_ADMIN_ACCESSORS)

  return (
    <>
      <AdminFilterableTable
        columns={CUOTAS_ADMIN_COLUMNS}
        columnFilters={columnFilters}
        onColumnFilterChange={onColumnFilterChange}
        globalSearch={globalSearch}
        onGlobalSearchChange={setGlobalSearch}
        filteredCount={filteredCount}
        totalCount={totalCount}
        globalSearchPlaceholder="Buscar cuota…"
      >
        {filteredRows.length === 0 ? (
          <tr>
            <td colSpan={CUOTAS_ADMIN_COLUMNS.length} className="text-center text-muted py-4">
              Sin resultados para los filtros aplicados.
            </td>
          </tr>
        ) : (
          filteredRows.map((c) => {
            const pendiente = c.estado !== 'Pagada'
            return (
              <tr key={c.cuotaId} className={c.esVencida ? 'table-danger' : undefined}>
                <td className="min-w-0">{formatPeriodo(c.periodoInicio)}</td>
                <td className="tabular-nums text-end">
                  {formatMxn(cuotaMontoTotal(c))}
                  {(c.montoMora ?? 0) > 0 && (
                    <span className="d-block text-muted small">
                      base {formatMxn(c.monto)} + mora {formatMxn(c.montoMora ?? 0)}
                    </span>
                  )}
                </td>
                <td className="tabular-nums text-nowrap">{formatFecha(c.fechaVencimiento)}</td>
                <td>
                  <span className={estadoBadgeClass[c.estado] ?? 'badge bg-secondary'}>{c.estado}</span>
                </td>
                <td className="text-center cq-actions text-nowrap">
                  {pendiente && onRegistrarPago ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => onRegistrarPago(c)}
                      aria-label={`Registrar pago cuota ${c.cuotaId}`}
                    >
                      <i className="mdi mdi-cash-check mr-1" aria-hidden="true" />
                      Registrar pago
                    </button>
                  ) : (
                    <span className="text-muted small">—</span>
                  )}
                </td>
              </tr>
            )
          })
        )}
      </AdminFilterableTable>
      <AdminMobileCardList
        className="d-md-none"
        rows={filteredRows}
        getRowKey={(c) => c.cuotaId}
        emptyMessage="Sin cuotas para mostrar."
        renderCard={(c) => (
          <CuotaAdminMobileCard
            cuota={c}
            onRegistrarPago={onRegistrarPago ? (cuota) => onRegistrarPago(cuota) : undefined}
          />
        )}
      />
    </>
  )
}
