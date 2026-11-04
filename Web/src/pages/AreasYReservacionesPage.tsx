import { zodResolver } from '@hookform/resolvers/zod'
import { MapPin } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAreasComunes } from '../features/visitas/useAreasComunes'
import { useReservaciones } from '../features/visitas/useReservaciones'
import { useReservacionesCalendario } from '../features/visitas/useReservacionesCalendario'
import { ReservasCalendarioSemanal } from '../features/visitas/ReservasCalendarioSemanal'
import { startOfWeekMonday } from '../features/visitas/reservasCalendarioUtils'
import { reservaFormSchema, type ReservaFormValues } from '../features/visitas/reservasSchemas'
import {
  EmptyState,
  FormModal,
  PageHeader,
  PortalPageLayout,
  PortalSection,
  PortalTableSection,
  PortalToolbar,
} from '../shared/components/admin'
import { PortalDataTable, PortalDataTableBody, PortalDataTableHead, PortalTabs } from '../shared/components/portal'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import { useToast } from '../shared/toast/ToastContext'
import { apiPost } from '../shared/lib/apiClient'
import type { CrearReservacionRequest, ReservacionArea } from '../shared/types/visitas'

function estadoBadge(estado: string) {
  const clases: Record<string, string> = {
    Pendiente: 'bg-warning-light text-warning border border-warning/30',
    Confirmada: 'bg-success-light text-success border border-success/25',
    Cancelada: 'bg-danger-light text-danger border border-danger/25',
  }
  return (
    <span className={`cq-portal-badge ${clases[estado] ?? 'bg-surface-alt text-neutral-700'}`}>{estado}</span>
  )
}

export function AreasYReservacionesPage() {
  const { areas, loading: loadingAreas, error: areasError } = useAreasComunes()
  const { reservaciones, loading: loadingRes, error: resError, refetch } = useReservaciones()

  const areasReservables = useMemo(
    () => areas.filter((a) => a.requiereReservacion),
    [areas],
  )

  const [tab, setTab] = useState<'calendario' | 'mias'>('calendario')
  const [areaCalendarioFiltro, setAreaCalendarioFiltro] = useState<number | null>(null)
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()))

  const {
    eventos: eventosCalendario,
    loading: loadingCalendario,
    error: calendarioError,
    refetch: refetchCalendario,
  } = useReservacionesCalendario(areaCalendarioFiltro, weekStart)

  const [modalArea, setModalArea] = useState<number | null>(null)
  const modalAreaNombre = areas.find((a) => a.areaComunId === modalArea)?.nombre
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const toast = useToast()
  useQueryErrorToast(areasError)
  useQueryErrorToast(resError)
  useQueryErrorToast(calendarioError, tab === 'calendario')
  useQueryErrorToast(formError, modalArea !== null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReservaFormValues>({
    resolver: zodResolver(reservaFormSchema),
    defaultValues: { fechaInicio: '', fechaFin: '' },
  })

  const closeModal = () => {
    setModalArea(null)
    setFormError(null)
    reset()
  }

  const onSubmit = handleSubmit(async (values) => {
    if (modalArea === null) return
    setSaving(true)
    setFormError(null)

    const body: CrearReservacionRequest = {
      areaComunId: modalArea,
      fechaInicio: new Date(values.fechaInicio).toISOString(),
      fechaFin: new Date(values.fechaFin).toISOString(),
    }

    const { status, problem, data } = await apiPost<ReservacionArea>('/VTS/ReservacionesArea', body)

    setSaving(false)

    if (status === 201 && data) {
      closeModal()
      toast.success('Reservación registrada correctamente.')
      refetch()
      void refetchCalendario()
      return
    }

    setFormError(problem?.detail ?? 'Error al crear la reservación.')
  })

  return (
    <PortalPageLayout width="4xl" className="flex flex-col gap-6">
      <PageHeader
        bordered
        title="Áreas comunes y reservaciones"
        description="Consulta amenidades, revisa disponibilidad en el calendario y administra tus reservas."
      />

      <PortalSection variant="padded" title="Amenidades">
        {areasError && (
          <p className="text-sm text-neutral" role="status">
            No se pudieron cargar las áreas.
          </p>
        )}
        {loadingAreas ? (
          <div className="cq-portal-area-grid" aria-label="Cargando áreas">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        ) : areas.length === 0 ? (
          <EmptyState title="No hay áreas comunes registradas." />
        ) : (
          <div className="cq-portal-area-grid">
            {areas.map((area) => (
              <article key={area.areaComunId} className="cq-portal-area-card">
                <div className="cq-portal-area-card__icon-row">
                  <span className="cq-portal-entity-icon" aria-hidden>
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="cq-portal-area-card__title">{area.nombre}</h3>
                    {area.descripcion && <p className="cq-portal-area-card__meta">{area.descripcion}</p>}
                    {area.capacidad && (
                      <p className="cq-portal-area-card__meta">Capacidad: {area.capacidad} personas</p>
                    )}
                  </div>
                </div>
                <div className="cq-portal-area-card__footer">
                  <span
                    className={`cq-portal-badge ${
                      area.requiereReservacion
                        ? 'bg-primary-light text-primary-dark border border-primary/20'
                        : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                    }`}
                  >
                    {area.requiereReservacion ? 'Requiere reserva' : 'Acceso libre'}
                  </span>
                  {area.requiereReservacion ? (
                    <button
                      type="button"
                      onClick={() => {
                        setModalArea(area.areaComunId)
                        reset()
                        setFormError(null)
                      }}
                      className="cq-portal-btn-primary !py-1.5 !text-sm"
                    >
                      Reservar
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </PortalSection>

      <section className="cq-portal-section cq-portal-reservas-panel">
        <div className="cq-portal-reservas-panel__head">
          <h2 className="mb-3 text-base font-semibold text-neutral-800">Calendario y mis reservas</h2>
          <PortalTabs
            ariaLabel="Vista de reservaciones"
            tabs={[
              { id: 'calendario', label: 'Calendario' },
              { id: 'mias', label: 'Mis reservas' },
            ]}
            activeId={tab}
            onChange={(id) => setTab(id as 'calendario' | 'mias')}
          />
        </div>

        <div className="cq-portal-reservas-panel__body">
          {tab === 'calendario' ? (
            areasReservables.length === 0 ? (
              <EmptyState title="Sin áreas reservables" description="No hay amenidades con reservación en este momento." />
            ) : (
              <div className="space-y-4">
                <PortalToolbar>
                  <label htmlFor="filtro-area-calendario">Área</label>
                  <select
                    id="filtro-area-calendario"
                    className="rounded-lg border border-neutral-200 bg-surface-alt px-3 py-2 text-sm"
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
                </PortalToolbar>
                <ReservasCalendarioSemanal
                  areaComunId={areaCalendarioFiltro}
                  weekStart={weekStart}
                  onWeekChange={setWeekStart}
                  eventos={eventosCalendario}
                  loading={loadingCalendario}
                />
              </div>
            )
          ) : resError ? (
            <button
              type="button"
              className="cursor-pointer text-sm text-primary underline"
              onClick={() => void refetch()}
            >
              Reintentar carga de reservaciones
            </button>
          ) : loadingRes ? (
            <div className="space-y-2" aria-label="Cargando reservaciones">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-neutral-100" />
              ))}
            </div>
          ) : reservaciones.length === 0 ? (
            <EmptyState title="Sin reservaciones" description="Cuando reserves un área, aparecerá aquí." />
          ) : (
            <PortalTableSection className="!border-0 !shadow-none !bg-transparent">
              <PortalDataTable>
                <PortalDataTableHead>
                  <tr>
                    <th>Área</th>
                    <th>Inicio</th>
                    <th>Fin</th>
                    <th>Estado</th>
                  </tr>
                </PortalDataTableHead>
                <PortalDataTableBody>
                  {reservaciones.map((r) => (
                    <tr key={r.reservacionAreaId}>
                      <td className="font-medium">{r.areaComun ?? `Área #${r.areaComunId}`}</td>
                      <td>{new Date(r.fechaInicio).toLocaleString('es-MX')}</td>
                      <td>{new Date(r.fechaFin).toLocaleString('es-MX')}</td>
                      <td>{estadoBadge(r.estado)}</td>
                    </tr>
                  ))}
                </PortalDataTableBody>
              </PortalDataTable>
            </PortalTableSection>
          )}
        </div>
      </section>

      <FormModal
        open={modalArea !== null}
        title={modalAreaNombre ? `Reservar: ${modalAreaNombre}` : 'Reservar área'}
        onClose={closeModal}
      >
        <form id="reserva-form" onSubmit={(e) => void onSubmit(e)} className="cq-portal-form">
          <div>
            <label htmlFor="fechaInicio">Fecha y hora de inicio</label>
            <input id="fechaInicio" type="datetime-local" {...register('fechaInicio')} />
            {errors.fechaInicio && <p className="mt-1 text-sm text-danger">{errors.fechaInicio.message}</p>}
          </div>
          <div>
            <label htmlFor="fechaFin">Fecha y hora de fin</label>
            <input id="fechaFin" type="datetime-local" {...register('fechaFin')} />
            {errors.fechaFin && <p className="mt-1 text-sm text-danger">{errors.fechaFin.message}</p>}
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button type="button" onClick={closeModal} className="cq-portal-btn">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="cq-portal-btn-primary disabled:opacity-50">
              {saving ? 'Guardando…' : 'Confirmar reserva'}
            </button>
          </div>
        </form>
      </FormModal>
    </PortalPageLayout>
  )
}
