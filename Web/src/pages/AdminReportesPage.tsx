import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MorososTable } from '../features/admin/finanzas/MorososTable'
import { useAuth } from '../features/auth/AuthContext'
import { PageHeader } from '../shared/components/admin'
import { AdminListToolbar } from '../shared/components/admin/AdminListToolbar'
import { PortalPageLayout } from '../shared/components/PortalPageLayout'
import { useToast } from '../shared/toast/ToastContext'
import { getAccessToken } from '../shared/lib/accessTokenStore'
import { BiTrendsPanel } from '../features/reportes/BiTrendsPanel'
import {
  biExportUrl,
  getBiTendencias,
  getMorososReporte,
  reporteFinanzasExportUrl,
  reporteTicketsExportUrl,
  type BiKpiSnapshot,
} from '../features/reportes/reportesAdmin.api'
import { normalizeBiSnapshots } from '../features/reportes/biTrendsUtils'
import type { Moroso } from '../shared/types/finanzasAdmin'

type Tab = 'morosos' | 'export' | 'bi'

const TAB_LABELS: Record<Tab, string> = {
  bi: 'Tendencias BI',
  morosos: 'Morosos',
  export: 'Exportar RPT',
}

export function AdminReportesPage() {
  const { session } = useAuth()
  const toast = useToast()
  const token = session?.token ?? ''
  const [tab, setTab] = useState<Tab>('bi')
  const [meses, setMeses] = useState(6)
  const [mes, setMes] = useState(String(new Date().getMonth() + 1))
  const [anio, setAnio] = useState(String(new Date().getFullYear()))
  const [snapshots, setSnapshots] = useState<BiKpiSnapshot[]>([])
  const [biLoading, setBiLoading] = useState(false)
  const [morosos, setMorosos] = useState<Moroso[]>([])
  const [morososLoading, setMorososLoading] = useState(false)
  const [morososError, setMorososError] = useState<string | null>(null)
  const [selectedMorosoKeys, setSelectedMorosoKeys] = useState<Set<string>>(() => new Set())

  const loadBi = useCallback(async () => {
    if (!token) return
    setBiLoading(true)
    const res = await getBiTendencias(token, meses)
    setBiLoading(false)
    if (res.data) setSnapshots(normalizeBiSnapshots(res.data))
    else toast.error(res.problem?.detail ?? 'No se pudieron cargar tendencias BI')
  }, [token, meses, toast])

  const loadMorosos = useCallback(async () => {
    if (!token) return
    setMorososLoading(true)
    setMorososError(null)
    const res = await getMorososReporte(token, Number(mes), Number(anio))
    setMorososLoading(false)
    if (res.data) {
      setMorosos(res.data)
      setSelectedMorosoKeys(new Set())
    } else setMorososError(res.problem?.detail ?? 'Error al cargar morosos')
  }, [token, mes, anio])

  const toggleMorosoRow = useCallback((key: string, checked: boolean) => {
    setSelectedMorosoKeys((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }, [])

  const toggleMorososVisible = useCallback((keys: string[], checked: boolean) => {
    setSelectedMorosoKeys((prev) => {
      const next = new Set(prev)
      for (const k of keys) {
        if (checked) next.add(k)
        else next.delete(k)
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (tab === 'morosos') void loadMorosos()
  }, [tab, loadMorosos])

  useEffect(() => {
    if (tab === 'bi') void loadBi()
  }, [tab, meses, loadBi])

  const morososMetrics = useMemo(
    () => [{ label: 'Registrados', value: morosos.length }],
    [morosos.length],
  )

  const download = (url: string, label: string) => {
    const t = getAccessToken()
    fetch(url, { headers: t ? { Authorization: `Bearer ${t}` } : {}, credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.blob()
      })
      .then((blob) => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = label
        a.click()
        URL.revokeObjectURL(a.href)
      })
      .catch(() => toast.error('Error al descargar'))
  }

  return (
    <PortalPageLayout>
      <PageHeader title="Reportes" subtitle="Morosos, exportaciones y tendencias BI" />

      <ul className="nav nav-tabs mb-3 cq-admin-tabs" role="tablist">
        {(['bi', 'morosos', 'export'] as const).map((t) => (
          <li className="nav-item" key={t} role="presentation">
            <button
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`nav-link ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {TAB_LABELS[t]}
            </button>
          </li>
        ))}
      </ul>

      {tab === 'morosos' && (
        <>
          <AdminListToolbar
            title="Morosos del período"
            metrics={morososMetrics}
            filterSlot={
              <div className="d-flex flex-wrap align-items-center gap-2">
                <label className="d-flex align-items-center gap-1 small mb-0">
                  <span className="text-muted">Mes</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    className="form-control form-control-sm"
                    style={{ width: '4.5rem' }}
                    value={mes}
                    onChange={(e) => setMes(e.target.value)}
                    aria-label="Mes"
                  />
                </label>
                <label className="d-flex align-items-center gap-1 small mb-0">
                  <span className="text-muted">Año</span>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    style={{ width: '5.5rem' }}
                    value={anio}
                    onChange={(e) => setAnio(e.target.value)}
                    aria-label="Año"
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => void loadMorosos()}
                  disabled={morososLoading}
                >
                  Actualizar
                </button>
              </div>
            }
          />
          {selectedMorosoKeys.size > 0 && (
            <div className="alert alert-light border d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 py-2 px-3">
              <span className="small mb-0">
                <strong>{selectedMorosoKeys.size}</strong> moroso
                {selectedMorosoKeys.size !== 1 ? 's' : ''} seleccionado
                {selectedMorosoKeys.size !== 1 ? 's' : ''}
              </span>
              <div className="d-flex flex-wrap gap-2">
                <Link to="/admin/finanzas" className="btn btn-sm btn-outline-primary">
                  Gestionar moras en Finanzas
                </Link>
                <Link to="/admin/notificaciones/aviso" className="btn btn-sm btn-primary">
                  Aviso a residentes
                </Link>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-muted"
                  onClick={() => setSelectedMorosoKeys(new Set())}
                >
                  Limpiar selección
                </button>
              </div>
            </div>
          )}
          <div className="card cq-admin-card">
            <div className="card-body pt-3">
              <MorososTable
                morosos={morosos}
                loading={morososLoading}
                error={morososError}
                selectedKeys={selectedMorosoKeys}
                onToggleRow={toggleMorosoRow}
                onToggleAllVisible={toggleMorososVisible}
              />
            </div>
          </div>
        </>
      )}

      {tab === 'export' && (
        <div className="row g-3">
          <div className="col-12">
            <div className="card cq-list-toolbar mb-0">
              <div className="card-body py-3">
                <h2 className="h5 mb-3">Período del reporte</h2>
                <div className="d-flex flex-wrap align-items-end gap-3">
                  <div>
                    <label className="form-label small text-muted mb-1">Mes</label>
                    <input
                      className="form-control form-control-sm"
                      style={{ width: '5rem' }}
                      value={mes}
                      onChange={(e) => setMes(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label small text-muted mb-1">Año</label>
                    <input
                      className="form-control form-control-sm"
                      style={{ width: '6rem' }}
                      value={anio}
                      onChange={(e) => setAnio(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card cq-admin-card h-100">
              <div className="card-body d-flex flex-column gap-3">
                <div>
                  <i className="mdi mdi-file-pdf-box text-danger fs-3" aria-hidden="true" />
                  <h3 className="h6 mt-2 mb-1">Finanzas del mes</h3>
                  <p className="text-muted small mb-0">
                    Cuotas pagadas y movimientos contables del condominio (PDF).
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-primary mt-auto align-self-start"
                  onClick={() =>
                    download(reporteFinanzasExportUrl(Number(mes), Number(anio), 'pdf'), 'finanzas.pdf')
                  }
                >
                  Descargar PDF
                </button>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card cq-admin-card h-100">
              <div className="card-body d-flex flex-column gap-3">
                <div>
                  <i className="mdi mdi-file-excel text-success fs-3" aria-hidden="true" />
                  <h3 className="h6 mt-2 mb-1">Tickets del período</h3>
                  <p className="text-muted small mb-0">Listado de tickets creados en el mes (Excel).</p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-primary mt-auto align-self-start"
                  onClick={() =>
                    download(reporteTicketsExportUrl(Number(mes), Number(anio), 'xlsx'), 'tickets.xlsx')
                  }
                >
                  Descargar Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'bi' && (
        <BiTrendsPanel
          snapshots={snapshots}
          loading={biLoading}
          meses={meses}
          onMesesChange={setMeses}
          onRefresh={() => void loadBi()}
          onExportPdf={() => download(biExportUrl(meses, 'pdf'), 'bi.pdf')}
          onExportExcel={() => download(biExportUrl(meses, 'xlsx'), 'bi.xlsx')}
        />
      )}

      <p className="mt-4 mb-0 text-muted small">
        Comunicación masiva:{' '}
        <Link to="/admin/notificaciones/aviso">Aviso general a residentes</Link>
      </p>
    </PortalPageLayout>
  )
}
