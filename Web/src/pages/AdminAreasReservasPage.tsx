import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import { useAreasComunes } from '../features/visitas/useAreasComunes'
import { useReservacionesCalendario } from '../features/visitas/useReservacionesCalendario'
import { ReservasCalendarioSemanal } from '../features/visitas/ReservasCalendarioSemanal'
import { startOfWeekMonday } from '../features/visitas/reservasCalendarioUtils'
import { useReservacionesAdmin } from '../features/admin/areas/useReservacionesAdmin'
import { usePadronUsuarios } from '../features/admin/usuarios/usePadronUsuarios'
import { AdminAreasComunesSection } from '../features/admin/areas/AdminAreasComunesSection'
import {
  reservaAdminCreateSchema,
  type ReservaAdminCreateForm,
} from '../features/admin/areas/areasAdminSchemas'
import {
  RESERVACIONES_ADMIN_ACCESSORS,
  RESERVACIONES_ADMIN_COLUMNS,
} from '../features/admin/areas/reservacionesAdminTableFilter'
import {
  AdminFilterableTable,
  AdminListToolbar,
  AdminSidePanel,
  AdminSplitLayout,
  ConfirmDialog,
} from '../shared/components/admin'
import { useClientTableFilter } from '../shared/hooks/useClientTableFilter'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import { apiPatch, apiPost } from '../shared/lib/apiClient'
import { useToast } from '../shared/toast/ToastContext'
import type { ReservacionAdminItem } from '../shared/types/visitas'

type Tab = 'areas' | 'reservaciones' | 'calendario'

function estadoBadge(estado: string) {
  const clases: Record<string, string> = {
    Pendiente: 'badge rounded-pill bg-warning text-dark',
    Confirmada: 'badge rounded-pill bg-success',
    Cancelada: 'badge rounded-pill bg-secondary',
  }
  return <span className={clases[estado] ?? 'badge rounded-pill bg-light text-dark border'}>{estado}</span>
}

export function AdminAreasReservasPage() {
  const toast = useToast()
  const { areas, error: areasError, loading: loadingAreas, refetch: refetchAreas } = useAreasComunes()
  const areasReservables = useMemo(() => areas.filter((a) => a.requiereReservacion), [areas])

  const [tab, setTab] = useState<Tab>('areas')
  const [cancelTarget, setCancelTarget] = useState<number | null>(null)
  const [estadoUpdatingId, setEstadoUpdatingId] = useState<number | null>(null)
  const [reservaCreateOpen, setReservaCreateOpen] = useState(false)
  const [reservaFormError, setReservaFormError] = useState<string | null>(null)

  const [areaCalendarioFiltro, setAreaCalendarioFiltro] = useState<number | null>(null)
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()))
  const [pagina, setPagina] = useState(1)
  const [filtroAreaId, setFiltroAreaId] = useState('')

  const areaListadoFiltro = filtroAreaId ? Number(filtroAreaId) : undefined

  const {
    eventos: eventosCalendario,
    loading: loadingCalendario,
    error: calendarioError,
    refetch: refetchCalendario,
  } = useReservacionesCalendario(areaCalendarioFiltro, weekStart)

  const {
    data: paginaAdmin,
    loading: loadingListado,
    error: listadoError,
    refetch: refetchListado,
  } = useReservacionesAdmin(
    {
      areaComunId: areaListadoFiltro && areaListadoFiltro > 0 ? areaListadoFiltro : undefined,
      pagina,
      tamano: 20,
    },
    tab === 'reservaciones',
  )

  const { data: usuariosPadron } = usePadronUsuarios(undefined, true)

  const listRows = paginaAdmin?.items ?? []

  const {
    filteredRows: filteredReservas,
    globalSearch,
    setGlobalSearch,
    columnFilters,
    onColumnFilterChange,
    filteredCount,
    totalCount,
  } = useClientTableFilter(listRows, RESERVACIONES_ADMIN_COLUMNS, RESERVACIONES_ADMIN_ACCESSORS)

  const reservaForm = useForm<ReservaAdminCreateForm>({
    resolver: zodResolver(reservaAdminCreateSchema),
    defaultValues: { usuarioId: '', areaComunId: '', fechaInicio: '', fechaFin: '' },
  })

  useQueryErrorToast(areasError)
  useQueryErrorToast(calendarioError, tab === 'calendario')
  useQueryErrorToast(listadoError, tab === 'reservaciones')

  const totalPaginas = paginaAdmin ? Math.max(1, Math.ceil(paginaAdmin.total / 20)) : 1

  const switchTab = (next: Tab) => {
    setReservaCreateOpen(false)
    setReservaFormError(null)
    setTab(next)
  }

  const openReservaCreate = () => {
    setReservaFormError(null)
    reservaForm.reset({
      usuarioId: '',
      areaComunId: areasReservables[0] ? String(areasReservables[0].areaComunId) : '',
      fechaInicio: '',
      fechaFin: '',
    })
    setReservaCreateOpen(true)
  }

  const onSaveReserva = reservaForm.handleSubmit(async (values) => {
    setReservaFormError(null)
    const { status, problem } = await apiPost('/VTS/ReservacionesArea/admin', {
      usuarioId: Number(values.usuarioId),
      areaComunId: Number(values.areaComunId),
      fechaInicio: new Date(values.fechaInicio).toISOString(),
      fechaFin: new Date(values.fechaFin).toISOString(),
    })
    if (status !== 201) {
      setReservaFormError(problem?.detail ?? `Error ${status}`)
      return
    }
    setReservaCreateOpen(false)
    toast.success('Reservación registrada')
    void refetchListado()
    void refetchCalendario()
  })

  const onConfirmCancel = async () => {
    if (cancelTarget === null) return
    const { problem, status } = await apiPatch(`/VTS/ReservacionesArea/${cancelTarget}/cancelar`)
    if (status !== 204) {
      toast.error(problem?.detail ?? `Error ${status}`)
      return
    }
    setCancelTarget(null)
    toast.success('Reservación cancelada')
    void refetchListado()
    void refetchCalendario()
  }

  const cambiarEstadoReserva = async (reservacionAreaId: number, estado: 'Pendiente' | 'Confirmada') => {
    setEstadoUpdatingId(reservacionAreaId)
    const { problem, status } = await apiPatch(`/VTS/ReservacionesArea/${reservacionAreaId}/estado`, {
      estado,
    })
    setEstadoUpdatingId(null)
    if (status !== 204) {
      toast.error(problem?.detail ?? `Error ${status}`)
      return
    }
    toast.success(estado === 'Confirmada' ? 'Reservación confirmada' : 'Marcada como pendiente')
    void refetchListado()
    void refetchCalendario()
  }

  const reservaMetrics = useMemo(
    () => [{ label: 'Reservaciones', value: paginaAdmin?.total ?? 0 }],
    [paginaAdmin?.total],
  )

  return (
    <div className="cq-admin-page container-fluid py-4">
      <ul className="nav nav-tabs mb-3 cq-admin-tabs">
        <li className="nav-item">
          <button type="button" className={`nav-link ${tab === 'areas' ? 'active' : ''}`} onClick={() => switchTab('areas')}>
            Áreas comunes
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === 'reservaciones' ? 'active' : ''}`}
            onClick={() => switchTab('reservaciones')}
          >
            Reservaciones
          </button>
        </li>
        <li className="nav-item">
          <button type="button" className={`nav-link ${tab === 'calendario' ? 'active' : ''}`} onClick={() => switchTab('calendario')}>
            Calendario
          </button>
        </li>
      </ul>

      {tab === 'areas' && (
        <AdminAreasComunesSection
          areas={areas}
          loading={loadingAreas}
          onReload={async () => {
            await refetchAreas()
          }}
        />
      )}

      {tab === 'calendario' && (
        <div className="card">
          <div className="card-body">
            {areasReservables.length === 0 ? (
              <div className="cq-empty-state">
                <p className="cq-empty-title">Sin áreas reservables</p>
                <p className="text-muted">Registra un área con «Requiere reservación» en la pestaña Áreas comunes.</p>
              </div>
            ) : (
              <>
                <div className="form-group mb-3" style={{ maxWidth: '20rem' }}>
                  <label className="cq-label">Área</label>
                  <select
                    className="form-control"
                    value={areaCalendarioFiltro ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      setAreaCalendarioFiltro(v === '' ? null : Number(v))
                    }}
                  >
                    <option value="">Todas las áreas</option>
                    {areasReservables.map((a) => (
                      <option key={a.areaComunId} value={a.areaComunId}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <ReservasCalendarioSemanal
                  areaComunId={areaCalendarioFiltro}
                  weekStart={weekStart}
                  onWeekChange={setWeekStart}
                  eventos={eventosCalendario}
                  loading={loadingCalendario}
                />
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'reservaciones' && (
        <>
          <AdminListToolbar
            title="Reservaciones"
            metrics={reservaMetrics}
            filterSlot={
              <select
                className="form-control form-control-sm"
                style={{ minWidth: '12rem' }}
                value={filtroAreaId}
                onChange={(e) => {
                  setFiltroAreaId(e.target.value)
                  setPagina(1)
                }}
                aria-label="Filtrar por área"
              >
                <option value="">Todas las áreas</option>
                {areas.map((a) => (
                  <option key={a.areaComunId} value={a.areaComunId}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            }
            primaryAction={{
              label: 'Nueva reservación',
              iconClass: 'mdi mdi-plus',
              onClick: openReservaCreate,
              disabled: areasReservables.length === 0,
            }}
          />

          <AdminSplitLayout
            panelOpen={reservaCreateOpen}
            tablePane={
              <div className="card">
                <div className="card-body pt-3">
                  {loadingListado && (
                    <div className="placeholder-glow" aria-label="Cargando reservaciones">
                      <span className="placeholder col-12 mb-2" />
                    </div>
                  )}
                  {!loadingListado && listRows.length === 0 && (
                    <div className="cq-empty-state">
                      <i className="mdi mdi-calendar-blank cq-empty-icon" />
                      <p className="cq-empty-title">Sin reservaciones</p>
                      <p className="text-muted">Crea una reservación o espera solicitudes de residentes.</p>
                    </div>
                  )}
                  {!loadingListado && listRows.length > 0 && (
                    <>
                      <AdminFilterableTable
                        columns={RESERVACIONES_ADMIN_COLUMNS}
                        columnFilters={columnFilters}
                        onColumnFilterChange={onColumnFilterChange}
                        globalSearch={globalSearch}
                        onGlobalSearchChange={setGlobalSearch}
                        filteredCount={filteredCount}
                        totalCount={totalCount}
                      >
                        {filteredReservas.map((r: ReservacionAdminItem) => (
                          <tr key={r.reservacionAreaId}>
                            <td className="min-w-0 text-break">{r.areaComun}</td>
                            <td className="min-w-0">
                              <div>{r.usuarioNombre}</div>
                              <div className="text-muted small text-break">{r.usuarioCorreo}</div>
                            </td>
                            <td className="tabular-nums text-nowrap">
                              {new Date(r.fechaInicio).toLocaleString('es-MX')}
                            </td>
                            <td className="tabular-nums text-nowrap">{new Date(r.fechaFin).toLocaleString('es-MX')}</td>
                            <td>{estadoBadge(r.estado)}</td>
                            <td className="text-center cq-actions text-nowrap">
                              {r.estado !== 'Cancelada' && (
                                <div className="btn-group btn-group-sm" role="group" aria-label="Acciones">
                                  {r.estado === 'Pendiente' && (
                                    <button
                                      type="button"
                                      className="btn btn-success"
                                      title="Confirmar"
                                      disabled={estadoUpdatingId === r.reservacionAreaId}
                                      onClick={() => void cambiarEstadoReserva(r.reservacionAreaId, 'Confirmada')}
                                    >
                                      <i className="mdi mdi-check" aria-hidden="true" />
                                      <span className="sr-only">Confirmar</span>
                                    </button>
                                  )}
                                  {r.estado === 'Confirmada' && (
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary"
                                      title="Marcar pendiente"
                                      disabled={estadoUpdatingId === r.reservacionAreaId}
                                      onClick={() => void cambiarEstadoReserva(r.reservacionAreaId, 'Pendiente')}
                                    >
                                      <i className="mdi mdi-clock-outline" aria-hidden="true" />
                                      <span className="sr-only">Pendiente</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger"
                                    title="Cancelar reservación"
                                    onClick={() => setCancelTarget(r.reservacionAreaId)}
                                  >
                                    <i className="mdi mdi-close-circle-outline" aria-hidden="true" />
                                    <span className="sr-only">Cancelar</span>
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </AdminFilterableTable>
                      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
                        <span className="text-muted small tabular-nums">
                          {paginaAdmin?.total ?? 0} en total (página {pagina} / {totalPaginas})
                        </span>
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            disabled={pagina <= 1}
                            onClick={() => setPagina((p) => Math.max(1, p - 1))}
                          >
                            Anterior
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            disabled={pagina >= totalPaginas}
                            onClick={() => setPagina((p) => p + 1)}
                          >
                            Siguiente
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            }
            formPane={
              <AdminSidePanel
                visible={reservaCreateOpen}
                title="Nueva reservación"
                subtitle="Horario libre en el área seleccionada."
                iconClass="mdi mdi-calendar-plus"
                editing={false}
                onClose={() => setReservaCreateOpen(false)}
                footer={
                  <>
                    <button type="button" className="btn btn-primary flex-grow-1" onClick={() => void onSaveReserva()}>
                      <i className="mdi mdi-check mr-1" />
                      Registrar
                    </button>
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setReservaCreateOpen(false)}>
                      Cancelar
                    </button>
                  </>
                }
              >
                {reservaFormError && (
                  <div className="alert alert-danger py-2 small" role="alert">
                    {reservaFormError}
                  </div>
                )}
                <div className="form-group mb-3">
                  <label className="cq-label">
                    Residente <span className="text-danger">*</span>
                  </label>
                  <select className="form-control" {...reservaForm.register('usuarioId')}>
                    <option value="">Seleccione…</option>
                    {usuariosPadron.map((u) => (
                      <option key={u.usuarioId} value={u.usuarioId}>
                        {u.nombre}
                        {u.correo ? ` (${u.correo})` : ''}
                      </option>
                    ))}
                  </select>
                  {reservaForm.formState.errors.usuarioId && (
                    <span className="text-danger small">{reservaForm.formState.errors.usuarioId.message}</span>
                  )}
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label">
                    Área <span className="text-danger">*</span>
                  </label>
                  <select className="form-control" {...reservaForm.register('areaComunId')}>
                    <option value="">Seleccione…</option>
                    {areasReservables.map((a) => (
                      <option key={a.areaComunId} value={a.areaComunId}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                  {reservaForm.formState.errors.areaComunId && (
                    <span className="text-danger small">{reservaForm.formState.errors.areaComunId.message}</span>
                  )}
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label">Inicio</label>
                  <input type="datetime-local" className="form-control" {...reservaForm.register('fechaInicio')} />
                  {reservaForm.formState.errors.fechaInicio && (
                    <span className="text-danger small">{reservaForm.formState.errors.fechaInicio.message}</span>
                  )}
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label">Fin</label>
                  <input type="datetime-local" className="form-control" {...reservaForm.register('fechaFin')} />
                  {reservaForm.formState.errors.fechaFin && (
                    <span className="text-danger small">{reservaForm.formState.errors.fechaFin.message}</span>
                  )}
                </div>
              </AdminSidePanel>
            }
          />
        </>
      )}

      <ConfirmDialog
        open={cancelTarget !== null}
        title="Cancelar reservación"
        message="La reservación pasará a estado Cancelada. ¿Continuar?"
        confirmLabel="Cancelar reserva"
        variant="danger"
        onCancel={() => setCancelTarget(null)}
        onConfirm={() => void onConfirmCancel()}
      />
    </div>
  )
}
