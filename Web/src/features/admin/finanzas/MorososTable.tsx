import { formatMxn } from '../../finanzas/format'
import {
  MOROSOS_TABLE_ACCESSORS,
  MOROSOS_TABLE_COLUMNS,
} from './morososTableFilter'
import { AdminFilterableTable } from '../../../shared/components/admin'
import { useClientTableFilter } from '../../../shared/hooks/useClientTableFilter'
import type { Moroso } from '../../../shared/types/finanzasAdmin'

type Props = {
  morosos: Moroso[]
  loading: boolean
  error: string | null
}

export function MorososTable({ morosos, loading, error }: Props) {
  const {
    filteredRows,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    onColumnFilterChange,
    filteredCount,
    totalCount,
  } = useClientTableFilter(morosos, MOROSOS_TABLE_COLUMNS, MOROSOS_TABLE_ACCESSORS)

  if (loading) {
    return (
      <div className="placeholder-glow">
        <span className="placeholder col-12 mb-2" />
        <span className="placeholder col-10" />
      </div>
    )
  }
  if (error) return <div className="alert alert-danger py-2" role="alert">{error}</div>
  if (morosos.length === 0) {
    return (
      <div className="cq-empty-state">
        <i className="mdi mdi-cash-remove cq-empty-icon" />
        <p className="cq-empty-title">Sin morosos</p>
        <p className="text-muted">No hay morosos en el período seleccionado.</p>
      </div>
    )
  }

  return (
    <AdminFilterableTable
      columns={MOROSOS_TABLE_COLUMNS}
      columnFilters={columnFilters}
      onColumnFilterChange={onColumnFilterChange}
      globalSearch={globalSearch}
      onGlobalSearchChange={setGlobalSearch}
      filteredCount={filteredCount}
      totalCount={totalCount}
    >
      {filteredRows.length === 0 ? (
        <tr>
          <td colSpan={MOROSOS_TABLE_COLUMNS.length} className="text-center text-muted py-4">
            Sin resultados para los filtros aplicados.
          </td>
        </tr>
      ) : (
        filteredRows.map((m) => (
          <tr key={`${m.usuarioId}-${m.casa ?? ''}`}>
            <td className="min-w-0">
              <span className="text-truncate d-block" title={m.nombre}>{m.nombre}</span>
            </td>
            <td className="min-w-0 break-words">{m.casa ?? '—'}</td>
            <td className="tabular-nums">{m.cuotasVencidas}</td>
            <td className="font-medium tabular-nums">{formatMxn(m.totalAdeudado)}</td>
          </tr>
        ))
      )}
    </AdminFilterableTable>
  )
}
