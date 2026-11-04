import { formatMxn } from '../finanzas/format'
import { BiTendenciasCharts } from './BiTendenciasCharts'
import {
  biHasVisibleTrend,
  formatBiPeriodLabel,
  latestSnapshot,
  morosidadPct,
} from './biTrendsUtils'
import type { BiKpiSnapshot } from './reportesAdmin.api'

const MESES_OPTIONS = [3, 6, 12] as const

type Props = {
  snapshots: BiKpiSnapshot[]
  loading: boolean
  meses: number
  onMesesChange: (n: number) => void
  onRefresh: () => void
  onExportPdf: () => void
  onExportExcel: () => void
}

export function BiTrendsPanel({
  snapshots,
  loading,
  meses,
  onMesesChange,
  onRefresh,
  onExportPdf,
  onExportExcel,
}: Props) {
  const latest = latestSnapshot(snapshots)
  const periodFrom =
    snapshots.length > 0
      ? formatBiPeriodLabel([...snapshots].sort((a, b) => a.fecha.localeCompare(b.fecha))[0]!.fecha)
      : null
  const periodTo = latest ? formatBiPeriodLabel(latest.fecha) : null

  return (
    <div className="cq-bi-trends d-flex flex-column gap-3">
      <div className="card cq-list-toolbar mb-0">
        <div className="card-body py-3">
          <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
            <div className="min-width-0">
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="cq-bi-toolbar-icon" aria-hidden="true">
                  <i className="mdi mdi-chart-timeline-variant" />
                </span>
                <h2 className="h5 mb-0">Tendencias BI</h2>
              </div>
              <p className="text-muted small mb-0">
                {periodFrom && periodTo
                  ? `Período: ${periodFrom} — ${periodTo} · ${snapshots.length} punto${snapshots.length !== 1 ? 's' : ''}`
                  : 'Indicadores mensuales del condominio (tickets, finanzas, morosidad).'}
              </p>
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2 cq-list-toolbar-actions">
              <div className="btn-group btn-group-sm" role="group" aria-label="Meses de historial">
                {MESES_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`btn ${meses === n ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => onMesesChange(n)}
                  >
                    {n}m
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={onRefresh}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" />
                    Cargando
                  </>
                ) : (
                  <>
                    <i className="mdi mdi-refresh me-1" aria-hidden="true" />
                    Actualizar
                  </>
                )}
              </button>
              <div className="btn-group btn-group-sm">
                <button type="button" className="btn btn-outline-secondary" onClick={onExportPdf}>
                  <i className="mdi mdi-file-pdf-box me-1" aria-hidden="true" />
                  PDF
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={onExportExcel}>
                  <i className="mdi mdi-file-excel me-1" aria-hidden="true" />
                  Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {latest && (
        <div className="cq-reserva-stat-strip cq-bi-kpi-strip" aria-label="Último snapshot">
          <div className="cq-reserva-stat">
            <span>Tickets abiertos</span>
            <strong>{latest.ticketsAbiertos}</strong>
          </div>
          <div className="cq-reserva-stat">
            <span>Cerrados (mes)</span>
            <strong>{latest.ticketsCerrados}</strong>
          </div>
          <div className="cq-reserva-stat">
            <span>Ingresos mes</span>
            <strong>{formatMxn(latest.ingresosMXN)}</strong>
          </div>
          <div className="cq-reserva-stat">
            <span>Egresos mes</span>
            <strong>{formatMxn(latest.egresosMXN)}</strong>
          </div>
          <div className="cq-reserva-stat">
            <span>Morosidad</span>
            <strong>{morosidadPct(latest)}%</strong>
          </div>
          <div className="cq-reserva-stat">
            <span>Ocupación</span>
            <strong>
              {latest.casasTotales > 0
                ? `${Math.round((latest.casasOcupadas / latest.casasTotales) * 100)}%`
                : '—'}
            </strong>
          </div>
        </div>
      )}

      {loading && snapshots.length === 0 ? (
        <div className="card cq-admin-card">
          <div className="card-body cq-bi-loading py-5 text-center text-muted">
            <div className="spinner-border text-primary mb-3" role="status" aria-label="Cargando" />
            <p className="mb-0">Calculando tendencias…</p>
          </div>
        </div>
      ) : (
        <>
          {snapshots.length > 0 && !biHasVisibleTrend(snapshots) && (
            <div className="alert alert-light border small mb-0 py-2 px-3 d-flex align-items-start gap-2">
              <i className="mdi mdi-information-outline text-primary mt-1" aria-hidden="true" />
              <span>
                Hay snapshots registrados pero las métricas están en cero. Ejecuta{' '}
                <code className="small">DB-010_bi_snapshots_demo.sql</code> para demo o opera finanzas/tickets
                y pulsa Actualizar.
              </span>
            </div>
          )}
          <BiTendenciasCharts snapshots={snapshots} />
        </>
      )}
    </div>
  )
}
