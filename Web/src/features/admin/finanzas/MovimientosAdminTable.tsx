import { AdminFilterableTable } from '../../../shared/components/admin'
import { useClientTableFilter } from '../../../shared/hooks/useClientTableFilter'
import type { MovimientoFnz } from '../../../shared/types/finanzasAdmin'
import { MOVIMIENTOS_ADMIN_ACCESSORS, MOVIMIENTOS_ADMIN_COLUMNS } from './movimientosAdminTableFilter'

type Props = {
  movimientos: MovimientoFnz[]
}

export function MovimientosAdminTable({ movimientos }: Props) {
  const {
    filteredRows,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    onColumnFilterChange,
    filteredCount,
    totalCount,
  } = useClientTableFilter(movimientos, MOVIMIENTOS_ADMIN_COLUMNS, MOVIMIENTOS_ADMIN_ACCESSORS)

  return (
    <AdminFilterableTable
      columns={MOVIMIENTOS_ADMIN_COLUMNS}
      columnFilters={columnFilters}
      onColumnFilterChange={onColumnFilterChange}
      globalSearch={globalSearch}
      onGlobalSearchChange={setGlobalSearch}
      filteredCount={filteredCount}
      totalCount={totalCount}
      globalSearchPlaceholder="Buscar movimiento…"
    >
      {filteredRows.length === 0 ? (
        <tr>
          <td colSpan={MOVIMIENTOS_ADMIN_COLUMNS.length} className="text-center text-muted py-4">
            Sin resultados para los filtros aplicados.
          </td>
        </tr>
      ) : (
        filteredRows.map((m) => (
          <tr key={m.transaccionId}>
            <td className="tabular-nums text-nowrap small">
              {new Date(m.fechaCreacion).toLocaleString('es-MX')}
            </td>
            <td className="min-w-0">{m.cuentaNombre}</td>
            <td>{m.tipoMovimiento}</td>
            <td className="min-w-0 text-break">{m.motivo ?? '—'}</td>
            <td className="tabular-nums text-end text-danger">
              {m.cargo != null
                ? m.cargo.toLocaleString('es-MX', { minimumFractionDigits: 2 })
                : '—'}
            </td>
            <td className="tabular-nums text-end text-success">
              {m.abono != null
                ? m.abono.toLocaleString('es-MX', { minimumFractionDigits: 2 })
                : '—'}
            </td>
          </tr>
        ))
      )}
    </AdminFilterableTable>
  )
}
