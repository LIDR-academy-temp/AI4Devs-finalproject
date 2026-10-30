import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import { usePadronUsuarios } from '../features/admin/usuarios/usePadronUsuarios'
import { AdminGenerarPaseQrSection } from '../features/admin/visitas/AdminGenerarPaseQrSection'
import { AdminTiposIdentificacionSection } from '../features/admin/visitas/AdminTiposIdentificacionSection'
import { formatCasaLabel } from '../features/admin/visitas/casaLabel'
import {
  casaIdFromForm,
  usuarioVisitadoIdFromForm,
  visitaEntradaSchema,
  type VisitaEntradaForm,
} from '../features/admin/visitas/visitasAdminSchemas'
import { useTiposIdentificacionVisitas } from '../features/admin/visitas/useTiposIdentificacionVisitas'
import { useCasasSelect } from '../features/admin/usuarios/useCasasSelect'
import { VisitaAdminMobileCard } from '../features/admin/visitas/VisitaAdminMobileCard'
import {
  VISITAS_TABLE_ACCESSORS,
  VISITAS_TABLE_COLUMNS,
} from '../features/admin/visitas/visitasTableFilter'
import { useVisitas } from '../features/visitas/useVisitas'
import {
  AdminFilterableTable,
  AdminListToolbar,
  AdminMobileCardList,
  AdminSidePanel,
  AdminSplitLayout,
  ConfirmDialog,
} from '../shared/components/admin'
import { useClientTableFilter } from '../shared/hooks/useClientTableFilter'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import { useToast } from '../shared/toast/ToastContext'
import { apiPatch, apiPost } from '../shared/lib/apiClient'
import type { VisitaListItem } from '../shared/types/visitas'

type AdminVisitasTab = 'visitas' | 'pases' | 'tipos'

export function AdminVisitasPage() {
  const [tab, setTab] = useState<AdminVisitasTab>('visitas')
  const [filtroCasaId, setFiltroCasaId] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const casaId = filtroCasaId ? Number(filtroCasaId) : undefined
  const { visitas, loading, error, refetch } = useVisitas({
    casaId: casaId && casaId > 0 ? casaId : undefined,
    desde: filtroDesde || undefined,
    hasta: filtroHasta || undefined,
  })
  const { data: usuarios } = usePadronUsuarios(undefined, true)
  const { casas, loading: casasLoading } = useCasasSelect()
  const { tipos, loading: tiposLoading, error: tiposError, recargar: recargarTipos } =
    useTiposIdentificacionVisitas()

  const [createOpen, setCreateOpen] = useState(false)
  const [salidaTarget, setSalidaTarget] = useState<VisitaListItem | null>(null)
  const [salidaError, setSalidaError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const toast = useToast()
  useQueryErrorToast(error)
  useQueryErrorToast(tab === 'tipos' ? tiposError : null)

  const heroStats = useMemo(() => {
    const enVisita = visitas.filter((v) => !v.fechaSalida).length
    return [
      { label: 'Registros', value: visitas.length },
      { label: 'En visita', value: enVisita },
      { label: 'Con salida', value: visitas.length - enVisita },
    ]
  }, [visitas])

  const {
    filteredRows: filteredVisitas,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    onColumnFilterChange,
    filteredCount,
    totalCount,
  } = useClientTableFilter(visitas, VISITAS_TABLE_COLUMNS, VISITAS_TABLE_ACCESSORS)

  const form = useForm<VisitaEntradaForm>({
    resolver: zodResolver(visitaEntradaSchema),
    defaultValues: {
      visitanteNombre: '',
      tipoIdentificacion: '',
      numeroIdentificacion: '',
      usuarioVisitadoId: '',
      casaId: '',
    },
  })

  const { register, handleSubmit, formState: { errors }, reset } = form
  const panelOpen = createOpen

  const openCreate = () => {
    setFormError(null)
    setTab('visitas')
    reset({
      visitanteNombre: '',
      tipoIdentificacion: tipos[0]?.tipoIdentificacion ?? '',
      numeroIdentificacion: '',
      usuarioVisitadoId: '',
      casaId: '',
    })
    setCreateOpen(true)
  }

  const closePanel = () => {
    setCreateOpen(false)
    setFormError(null)
  }

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null)
    const usuarioVisitadoId = usuarioVisitadoIdFromForm(data.usuarioVisitadoId)
    const { problem, status } = await apiPost('/VTS/Visitas', {
      visitanteNombre: data.visitanteNombre,
      tipoIdentificacion: data.tipoIdentificacion,
      numeroIdentificacion: data.numeroIdentificacion,
      usuarioVisitadoId,
      casaId: casaIdFromForm(data.casaId),
    })
    if (problem) {
      setFormError(problem.detail ?? `Error ${status}`)
      return
    }
    closePanel()
    toast.success('Entrada registrada')
    await refetch()
  })

  const handleConfirmSalida = async () => {
    if (!salidaTarget) return
    setSalidaError(null)
    const { problem, status } = await apiPatch(`/VTS/Visitas/${salidaTarget.visitaId}/salida`, {})
    if (problem) {
      setSalidaError(problem.detail ?? `Error ${status}`)
      return
    }
    setSalidaTarget(null)
    toast.success('Salida registrada')
    await refetch()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && panelOpen) closePanel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [panelOpen])

  const formFooter = (
    <>
      <button type="button" className="btn btn-primary flex-grow-1" onClick={() => void onSubmit()}>
        <i className="mdi mdi-login mr-1" />
        Registrar entrada
      </button>
      <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>
        Cancelar
      </button>
    </>
  )

  const primaryAction =
    tab === 'visitas'
      ? {
          label: 'Registrar entrada',
          iconClass: 'mdi mdi-plus',
          onClick: openCreate,
        }
      : {
          label: 'Actualizar',
          iconClass: 'mdi mdi-refresh',
          onClick: () => void recargarTipos(),
        }

  return (
    <div className="cq-admin-page container-fluid py-4">
      <ul className="nav nav-tabs mb-3 cq-admin-tabs">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === 'visitas' ? 'active' : ''}`}
            onClick={() => setTab('visitas')}
          >
            Registro
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === 'pases' ? 'active' : ''}`}
            onClick={() => {
              closePanel()
              setTab('pases')
            }}
          >
            Pases QR
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === 'tipos' ? 'active' : ''}`}
            onClick={() => {
              closePanel()
              setTab('tipos')
            }}
          >
            Tipos de ID
          </button>
        </li>
      </ul>

      {tab === 'pases' && (
        <AdminGenerarPaseQrSection
          usuarios={usuarios ?? []}
          casas={casas}
          casasLoading={casasLoading}
          tipos={tipos}
          tiposLoading={tiposLoading}
        />
      )}

      {tab === 'tipos' && (
        <>
          <AdminListToolbar
            title="Tipos de identificación"
            metrics={[{ label: 'Tipos', value: tipos.length }]}
            primaryAction={primaryAction}
          />
          <AdminTiposIdentificacionSection
            tipos={tipos}
            loading={tiposLoading}
            onReload={recargarTipos}
          />
        </>
      )}

      {tab === 'visitas' && (
      <>
      <AdminListToolbar
        title="Visitas"
        metrics={heroStats}
        filterSlot={
          <div className="d-flex flex-wrap gap-2">
            <select
              className="form-control form-control-sm"
              value={filtroCasaId}
              onChange={(e) => setFiltroCasaId(e.target.value)}
              aria-label="Filtrar por casa"
              disabled={casasLoading}
            >
              <option value="">Todas las casas</option>
              {casas.map((c) => (
                <option key={c.casaId} value={String(c.casaId)}>
                  {formatCasaLabel(c)}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="form-control form-control-sm"
              value={filtroDesde}
              onChange={(e) => setFiltroDesde(e.target.value)}
              aria-label="Desde"
            />
            <input
              type="date"
              className="form-control form-control-sm"
              value={filtroHasta}
              onChange={(e) => setFiltroHasta(e.target.value)}
              aria-label="Hasta"
            />
          </div>
        }
        primaryAction={primaryAction}
      />

      <AdminSplitLayout
        panelOpen={panelOpen}
        tablePane={
          <div className="card">
            <div className="card-body pt-3">
              {loading && (
                <div className="placeholder-glow" aria-label="Cargando visitas">
                  <span className="placeholder col-12 mb-2" />
                  <span className="placeholder col-10" />
                </div>
              )}

              {!loading && !error && visitas.length === 0 && (
                <div className="cq-empty-state">
                  <i className="mdi mdi-account-multiple-outline cq-empty-icon" />
                  <p className="cq-empty-title">Sin visitas</p>
                  <p className="text-muted">No hay visitas registradas para los filtros actuales.</p>
                </div>
              )}

              {!loading && !error && visitas.length > 0 && (
                <>
                <AdminFilterableTable
                  columns={VISITAS_TABLE_COLUMNS}
                  columnFilters={columnFilters}
                  onColumnFilterChange={onColumnFilterChange}
                  globalSearch={globalSearch}
                  onGlobalSearchChange={setGlobalSearch}
                  filteredCount={filteredCount}
                  totalCount={totalCount}
                >
                  {filteredVisitas.length === 0 ? (
                    <tr>
                      <td colSpan={VISITAS_TABLE_COLUMNS.length} className="text-center text-muted py-4">
                        Sin resultados para los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredVisitas.map((v) => (
                      <tr key={v.visitaId}>
                        <td className="min-w-0 font-weight-bold text-break">{v.visitanteNombre}</td>
                        <td className="min-w-0 text-break">
                          {v.tipoIdentificacion}: {v.numeroIdentificacion}
                        </td>
                        <td>{v.numeroCasa ?? '—'}</td>
                        <td className="tabular-nums">{new Date(v.fechaEntrada).toLocaleString('es-MX')}</td>
                        <td className="tabular-nums">
                          {v.fechaSalida ? (
                            new Date(v.fechaSalida).toLocaleString('es-MX')
                          ) : (
                            <span className="text-warning font-weight-bold">En visita</span>
                          )}
                        </td>
                        <td className="text-center cq-actions">
                          {!v.fechaSalida && (
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              onClick={() => setSalidaTarget(v)}
                            >
                              Salida
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </AdminFilterableTable>
                <AdminMobileCardList
                  rows={filteredVisitas}
                  getRowKey={(v) => v.visitaId}
                  renderCard={(v) => (
                    <VisitaAdminMobileCard visita={v} onSalida={(item) => setSalidaTarget(item)} />
                  )}
                />
                </>
              )}
            </div>
          </div>
        }
        formPane={
          <AdminSidePanel
            visible={panelOpen}
            title="Registrar entrada"
            subtitle="Captura al visitante y al residente que recibe la visita."
            iconClass="mdi mdi-login"
            editing={false}
            onClose={closePanel}
            footer={formFooter}
          >
            {formError && (
              <div className="alert alert-danger py-2 small" role="alert">{formError}</div>
            )}
            <div className="form-group mb-3">
              <label className="cq-label" htmlFor="visita-nombre">
                <i className="mdi mdi-account" />
                Visitante <span className="text-danger">*</span>
              </label>
              <input id="visita-nombre" className="form-control" {...register('visitanteNombre')} />
              {errors.visitanteNombre && (
                <span className="text-danger small d-block">{errors.visitanteNombre.message}</span>
              )}
            </div>
            <div className="form-group mb-3">
              <label className="cq-label" htmlFor="visita-residente">
                <i className="mdi mdi-home-account" />
                Residente visitado <span className="text-danger">*</span>
              </label>
              <select id="visita-residente" className="form-control" {...register('usuarioVisitadoId')}>
                <option value="">Seleccione…</option>
                {usuarios.map((u) => (
                  <option key={u.usuarioId} value={u.usuarioId}>
                    {u.nombre} ({u.correo})
                  </option>
                ))}
              </select>
              {errors.usuarioVisitadoId && (
                <span className="text-danger small d-block">{errors.usuarioVisitadoId.message}</span>
              )}
            </div>
            <div className="form-group mb-3">
              <label className="cq-label" htmlFor="visita-tipo-id">
                <i className="mdi mdi-card-account-details" />
                Tipo ID <span className="text-danger">*</span>
              </label>
              <select
                id="visita-tipo-id"
                className="form-control"
                {...register('tipoIdentificacion')}
                disabled={tiposLoading || tipos.length === 0}
              >
                {tipos.length === 0 ? (
                  <option value="">Sin tipos — créalos en la pestaña Tipos de ID</option>
                ) : (
                  tipos.map((t) => (
                    <option key={t.tipoIdentificacionId} value={t.tipoIdentificacion}>
                      {t.tipoIdentificacion}
                    </option>
                  ))
                )}
              </select>
              {errors.tipoIdentificacion && (
                <span className="text-danger small d-block">{errors.tipoIdentificacion.message}</span>
              )}
            </div>
            <div className="form-group mb-3">
              <label className="cq-label" htmlFor="visita-num-id">
                <i className="mdi mdi-identifier" />
                Número ID <span className="text-danger">*</span>
              </label>
              <input id="visita-num-id" className="form-control" {...register('numeroIdentificacion')} />
              {errors.numeroIdentificacion && (
                <span className="text-danger small d-block">{errors.numeroIdentificacion.message}</span>
              )}
            </div>
            <div className="form-group mb-0">
              <label className="cq-label" htmlFor="visita-casa">
                <i className="mdi mdi-home" />
                Casa (opcional)
              </label>
              <select
                id="visita-casa"
                className="form-control"
                {...register('casaId')}
                disabled={casasLoading}
              >
                <option value="">Sin asignar</option>
                {casas.map((c) => (
                  <option key={c.casaId} value={String(c.casaId)}>
                    {formatCasaLabel(c)}
                  </option>
                ))}
              </select>
            </div>
          </AdminSidePanel>
        }
      />

      <ConfirmDialog
        open={salidaTarget !== null}
        title="Registrar salida"
        message={
          salidaTarget
            ? `¿Registrar salida de ${salidaTarget.visitanteNombre}?`
            : ''
        }
        confirmLabel="Registrar salida"
        onCancel={() => {
          setSalidaTarget(null)
          setSalidaError(null)
        }}
        onConfirm={() => void handleConfirmSalida()}
      />
      {salidaTarget && salidaError && (
        <div className="alert alert-danger mt-3" role="alert">{salidaError}</div>
      )}
      </>
      )}
    </div>
  )
}
