import { formatMxn } from '../../finanzas/format'
import {
  MOROSOS_TABLE_ACCESSORS,
  MOROSOS_TABLE_COLUMNS,
} from './morososTableFilter'
import { MorosoAdminMobileCard } from './MorosoAdminMobileCard'
import { morosoSelectionKey } from './morosoSelection'
import { AdminFilterableTable, AdminMobileCardList } from '../../../shared/components/admin'
import { useClientTableFilter } from '../../../shared/hooks/useClientTableFilter'
import { useQueryErrorToast } from '../../../shared/hooks/useQueryErrorToast'
import type { Moroso } from '../../../shared/types/finanzasAdmin'

type Props = {
  morosos: Moroso[]
  loading: boolean
  error: string | null
  selectedKeys: ReadonlySet<string>
  onToggleRow: (key: string, checked: boolean) => void
  onToggleAllVisible: (keys: string[], checked: boolean) => void
}

export function MorososTable({
  morosos,
  loading,
  error,
  selectedKeys,
  onToggleRow,
  onToggleAllVisible,
}: Props) {
  useQueryErrorToast(error)

  const {
    filteredRows,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    onColumnFilterChange,
    filteredCount,
    totalCount,
  } = useClientTableFilter(morosos, MOROSOS_TABLE_COLUMNS, MOROSOS_TABLE_ACCESSORS)

  const visibleKeys = filteredRows.map((m) => morosoSelectionKey(m))
  const allVisibleSelected =
    visibleKeys.length > 0 && visibleKeys.every((k) => selectedKeys.has(k))
  const someVisibleSelected = visibleKeys.some((k) => selectedKeys.has(k))

  if (loading) {
    return (
      <div className="placeholder-glow">
        <span className="placeholder col-12 mb-2" />
        <span className="placeholder col-10" />
      </div>
    )
  }
  if (error) return null
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
    <>
      <div className="form-check mb-2 px-1">
        <input
          className="form-check-input"
          type="checkbox"
          id="morosos-sel-all"
          checked={allVisibleSelected}
          ref={(el) => {
            if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected
          }}
          onChange={(e) => onToggleAllVisible(visibleKeys, e.target.checked)}
        />
        <label className="form-check-label small" htmlFor="morosos-sel-all">
          Seleccionar todos los visibles ({filteredRows.length})
        </label>
      </div>
      <AdminFilterableTable
        columns={MOROSOS_TABLE_COLUMNS}
        columnFilters={columnFilters}
        onColumnFilterChange={onColumnFilterChange}
        globalSearch={globalSearch}
        onGlobalSearchChange={setGlobalSearch}
        filteredCount={filteredCount}
        totalCount={totalCount}
        showLeadingColumn
      >
        {filteredRows.length === 0 ? (
          <tr>
            <td colSpan={MOROSOS_TABLE_COLUMNS.length + 1} className="text-center text-muted py-4">
              Sin resultados para los filtros aplicados.
            </td>
          </tr>
        ) : (
          filteredRows.map((m) => {
            const key = morosoSelectionKey(m)
            return (
              <tr key={key}>
                <td className="text-center cq-actions">
                  <input
                    type="checkbox"
                    className="form-check-input mt-0"
                    aria-label={`Seleccionar ${m.nombre}`}
                    checked={selectedKeys.has(key)}
                    onChange={(e) => onToggleRow(key, e.target.checked)}
                  />
                </td>
                <td className="min-w-0">
                  <span className="text-truncate d-block" title={m.nombre}>
                    {m.nombre}
                  </span>
                </td>
                <td className="min-w-0 break-words">{m.casa ?? '—'}</td>
                <td className="tabular-nums">{m.cuotasVencidas}</td>
                <td className="min-w-0">
                  {(m.morasAplicadas ?? 0) > 0 ? (
                    <>
                      <span className="badge bg-warning text-dark">{m.morasAplicadas}</span>
                      <span className="d-block text-muted small mt-1">
                        Tienes {m.morasAplicadas} mora{(m.morasAplicadas ?? 0) !== 1 ? 's' : ''} aplicada
                        {(m.morasAplicadas ?? 0) !== 1 ? 's' : ''} ({formatMxn(m.totalMora ?? 0)})
                      </span>
                    </>
                  ) : (
                    <span className="text-muted">Sin mora</span>
                  )}
                </td>
                <td className="font-medium tabular-nums">{formatMxn(m.totalAdeudado)}</td>
              </tr>
            )
          })
        )}
      </AdminFilterableTable>
      <AdminMobileCardList
        rows={filteredRows}
        getRowKey={(m) => morosoSelectionKey(m)}
        renderCard={(m) => {
          const key = morosoSelectionKey(m)
          return (
            <div className="d-flex gap-2 align-items-start">
              <input
                type="checkbox"
                className="form-check-input mt-2 flex-shrink-0"
                aria-label={`Seleccionar ${m.nombre}`}
                checked={selectedKeys.has(key)}
                onChange={(e) => onToggleRow(key, e.target.checked)}
              />
              <div className="flex-grow-1 min-width-0">
                <MorosoAdminMobileCard moroso={m} />
              </div>
            </div>
          )
        }}
      />
    </>
  )
}
