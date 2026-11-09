import {
  AdminFilterableTable,
  AdminMobileCardList,
} from '../../../shared/components/admin'
import { useClientTableFilter } from '../../../shared/hooks/useClientTableFilter'
import type { PaseVisita } from '../../../shared/types/visitasPase'
import { pasePuedeEditarse } from '../../visitas/visitasPaseSchemas'
import { PaseQrAdminMobileCard } from './PaseQrAdminMobileCard'
import { PaseEstadoBadge } from './PaseEstadoBadge'
import {
  PASES_QR_TABLE_ACCESSORS,
  PASES_QR_TABLE_COLUMNS,
  tipoPaseLabel,
  vigenciaResumen,
} from './pasesQrTableFilter'

type Props = {
  pases: PaseVisita[]
  loading: boolean
  selectedId?: number | null
  onShare: (p: PaseVisita) => void
  onEdit: (p: PaseVisita) => void
  onCancel: (p: PaseVisita) => void
}

export function AdminPasesQrTable({ pases, loading, selectedId, onShare, onEdit, onCancel }: Props) {
  const {
    filteredRows,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    onColumnFilterChange,
    filteredCount,
    totalCount,
  } = useClientTableFilter(pases, PASES_QR_TABLE_COLUMNS, PASES_QR_TABLE_ACCESSORS)

  if (loading) {
    return (
      <div className="placeholder-glow" aria-label="Cargando pases">
        <span className="placeholder col-12 mb-2" />
        <span className="placeholder col-10" />
      </div>
    )
  }

  if (pases.length === 0) {
    return (
      <div className="cq-empty-state">
        <i className="mdi mdi-qrcode cq-empty-icon" />
        <p className="cq-empty-title">Sin pases QR</p>
        <p className="text-muted mb-0">Pulsa <strong>Nuevo pase QR</strong> para generar uno y compartirlo.</p>
      </div>
    )
  }

  return (
    <>
      <AdminFilterableTable
        columns={PASES_QR_TABLE_COLUMNS}
        columnFilters={columnFilters}
        onColumnFilterChange={onColumnFilterChange}
        globalSearch={globalSearch}
        onGlobalSearchChange={setGlobalSearch}
        filteredCount={filteredCount}
        totalCount={totalCount}
        tableClassName="table table-sm table-striped table-hover align-middle cq-admin-table cq-filterable"
      >
        {filteredRows.length === 0 ? (
          <tr>
            <td colSpan={PASES_QR_TABLE_COLUMNS.length} className="text-center text-muted py-4">
              Sin resultados para los filtros aplicados.
            </td>
          </tr>
        ) : (
          filteredRows.map((p) => (
            <tr
              key={p.visitaGeneradaId}
              className={selectedId === p.visitaGeneradaId ? 'cq-row-active' : undefined}
            >
              <td className="min-w-0 font-weight-bold text-break">{p.nombreVisitante}</td>
              <td className="min-w-0 text-break">{p.nombreVisitado ?? '—'}</td>
              <td className="min-w-0 text-break">{p.direccionCasa ?? '—'}</td>
              <td>{tipoPaseLabel(p)}</td>
              <td className="tabular-nums small">{vigenciaResumen(p)}</td>
              <td>
                <PaseEstadoBadge pase={p} />
              </td>
              <td className="text-end cq-actions">
                <button
                  type="button"
                  className="btn btn-link btn-sm"
                  onClick={() => onShare(p)}
                  aria-label={`Compartir pase ${p.nombreVisitante}`}
                >
                  <i className="mdi mdi-share-variant" />
                </button>
                <button
                  type="button"
                  className="btn btn-link btn-sm"
                  disabled={!pasePuedeEditarse(p)}
                  onClick={() => onEdit(p)}
                  aria-label={`Modificar pase ${p.nombreVisitante}`}
                >
                  <i className="mdi mdi-pencil" />
                </button>
                <button
                  type="button"
                  className="btn btn-link btn-sm text-danger"
                  onClick={() => onCancel(p)}
                  aria-label={`Cancelar pase ${p.nombreVisitante}`}
                >
                  <i className="mdi mdi-delete" />
                </button>
              </td>
            </tr>
          ))
        )}
      </AdminFilterableTable>
      <AdminMobileCardList
        rows={filteredRows}
        getRowKey={(p) => p.visitaGeneradaId}
        renderCard={(p) => (
          <PaseQrAdminMobileCard
            pase={p}
            active={selectedId === p.visitaGeneradaId}
            onShare={onShare}
          />
        )}
      />
    </>
  )
}
