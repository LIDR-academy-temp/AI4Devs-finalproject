import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAreasComunes } from '../features/visitas/useAreasComunes'
import { useReservaciones } from '../features/visitas/useReservaciones'
import { useReservacionesCalendario } from '../features/visitas/useReservacionesCalendario'
import { ReservasCalendarioSemanal } from '../features/visitas/ReservasCalendarioSemanal'
import { startOfWeekMonday } from '../features/visitas/reservasCalendarioUtils'
import { reservaFormSchema, type ReservaFormValues } from '../features/visitas/reservasSchemas'
import { FormModal, PageHeader } from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import { useToast } from '../shared/toast/ToastContext'
import { apiPost } from '../shared/lib/apiClient'
import type { CrearReservacionRequest, ReservacionArea } from '../shared/types/visitas'

function estadoBadge(estado: string) {
  const clases: Record<string, string> = {
    Pendiente: 'bg-warning-light text-warning',
    Confirmada: 'bg-success-light text-success',
    Cancelada: 'bg-danger-light text-danger',
  }
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${clases[estado] ?? 'bg-surface-alt text-neutral-700'}`}
    >
      {estado}
    </span>
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
  const [areaCalendarioId, setAreaCalendarioId] = useState<number | null>(null)
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()))

  const areaCalendarioEfectiva =
    areaCalendarioId ?? areasReservables[0]?.areaComunId ?? null

  const {
    eventos: eventosCalendario,
    loading: loadingCalendario,
    error: calendarioError,
    refetch: refetchCalendario,
  } = useReservacionesCalendario(areaCalendarioEfectiva, weekStart)

  const [modalArea, setModalArea] = useState<number | null>(null)
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
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-6">
      <PageHeader
        title="Áreas comunes y reservaciones"
        description="Reserva amenidades y consulta tus reservaciones activas."
      />

      <section>
        <h2 className="text-lg font-semibold text-neutral-700 mb-3">Áreas disponibles</h2>
        {areasError && (
          <p className="text-sm text-neutral" role="status">No se pudieron cargar las áreas.</p>
        )}
        {loadingAreas ? (
          <div className="space-y-3" aria-label="Cargando áreas">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-neutral-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : areas.length === 0 ? (
          <p className="text-neutral">No hay áreas comunes registradas.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {areas.map((area) => (
              <div key={area.areaComunId} className="rounded-lg border border-neutral-100 bg-surface-alt p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-neutral-900">{area.nombre}</h3>
                    {area.descripcion && <p className="text-sm text-neutral mt-1">{area.descripcion}</p>}
                    {area.capacidad && (
                      <p className="text-xs text-neutral mt-1">Capacidad: {area.capacidad} personas</p>
                    )}
                  </div>
                  {area.requiereReservacion && (
                    <button
                      type="button"
                      onClick={() => {
                        setModalArea(area.areaComunId)
                        reset()
                        setFormError(null)
                      }}
                      className="cursor-pointer shrink-0 px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary-dark whitespace-nowrap"
                    >
                      Reservar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex gap-2 border-b border-neutral-100" role="tablist" aria-label="Vista de reservaciones">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'calendario'}
            className={`cursor-pointer px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === 'calendario' ? 'border-primary text-primary' : 'border-transparent text-neutral-600'
            }`}
            onClick={() => setTab('calendario')}
          >
            Calendario
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'mias'}
            className={`cursor-pointer px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === 'mias' ? 'border-primary text-primary' : 'border-transparent text-neutral-600'
            }`}
            onClick={() => setTab('mias')}
          >
            Mis reservas
          </button>
        </div>

        {tab === 'calendario' ? (
          <div className="space-y-4">
            {areasReservables.length === 0 ? (
              <p className="text-neutral">No hay áreas reservables para mostrar en el calendario.</p>
            ) : (
              <>
                <label className="block text-sm font-medium text-neutral-700">
                  Área
                  <select
                    className="mt-1 w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={areaCalendarioEfectiva ?? ''}
                    onChange={(e) => setAreaCalendarioId(Number(e.target.value))}
                  >
                    {areasReservables.map((a) => (
                      <option key={a.areaComunId} value={a.areaComunId}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                {areaCalendarioEfectiva !== null && (
                  <ReservasCalendarioSemanal
                    areaComunId={areaCalendarioEfectiva}
                    weekStart={weekStart}
                    onWeekChange={setWeekStart}
                    eventos={eventosCalendario}
                    loading={loadingCalendario}
                  />
                )}
              </>
            )}
          </div>
        ) : (
          <>
        <h2 className="text-lg font-semibold text-neutral-700 mb-3">Mis reservaciones</h2>
        {resError && (
          <button
            type="button"
            className="mb-2 cursor-pointer text-sm text-primary underline"
            onClick={() => void refetch()}
          >
            Reintentar carga de reservaciones
          </button>
        )}
        {loadingRes ? (
          <div className="space-y-2" aria-label="Cargando reservaciones">
            {[1, 2].map((i) => <div key={i} className="h-14 bg-neutral-100 rounded animate-pulse" />)}
          </div>
        ) : reservaciones.length === 0 ? (
          <p className="text-neutral">No tienes reservaciones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left border">
              <thead className="bg-surface text-neutral uppercase text-xs">
                <tr>
                  <th className="px-4 py-2">Área</th>
                  <th className="px-4 py-2">Inicio</th>
                  <th className="px-4 py-2">Fin</th>
                  <th className="px-4 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reservaciones.map((r) => (
                  <tr key={r.reservacionAreaId} className="hover:bg-surface">
                    <td className="px-4 py-2 font-medium">{r.areaComun ?? `Área #${r.areaComunId}`}</td>
                    <td className="px-4 py-2">{new Date(r.fechaInicio).toLocaleString('es-MX')}</td>
                    <td className="px-4 py-2">{new Date(r.fechaFin).toLocaleString('es-MX')}</td>
                    <td className="px-4 py-2">{estadoBadge(r.estado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
          </>
        )}
      </section>

      <FormModal open={modalArea !== null} title="Reservar área" onClose={closeModal}>
        <form id="reserva-form" onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="fechaInicio">
              Fecha y hora de inicio *
            </label>
            <input
              id="fechaInicio"
              type="datetime-local"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              {...register('fechaInicio')}
            />
            {errors.fechaInicio && (
              <p className="mt-1 text-sm text-danger-600">{errors.fechaInicio.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="fechaFin">
              Fecha y hora de fin *
            </label>
            <input
              id="fechaFin"
              type="datetime-local"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              {...register('fechaFin')}
            />
            {errors.fechaFin && (
              <p className="mt-1 text-sm text-danger-600">{errors.fechaFin.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="cursor-pointer rounded-lg border px-4 py-2 text-sm hover:bg-surface"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Confirmar'}
            </button>
          </div>
        </form>
      </FormModal>
    </main>
  )
}
