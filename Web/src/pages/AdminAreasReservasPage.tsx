import { useMemo, useState } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import { useAreasComunes } from '../features/visitas/useAreasComunes'
import { useReservacionesCalendario } from '../features/visitas/useReservacionesCalendario'
import { ReservasCalendarioSemanal } from '../features/visitas/ReservasCalendarioSemanal'
import { startOfWeekMonday } from '../features/visitas/reservasCalendarioUtils'
import { useReservacionesAdmin } from '../features/admin/areas/useReservacionesAdmin'
import { PageHeader } from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'

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

export function AdminAreasReservasPage() {
  const { areas, error: areasError } = useAreasComunes()
  const areasReservables = useMemo(
    () => areas.filter((a) => a.requiereReservacion),
    [areas],
  )

  const [tab, setTab] = useState<'calendario' | 'listado'>('calendario')
  const [areaCalendarioId, setAreaCalendarioId] = useState<number | null>(null)
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()))
  const [pagina, setPagina] = useState(1)
  const [filtroAreaId, setFiltroAreaId] = useState('')

  const areaCalendarioEfectiva =
    areaCalendarioId ?? areasReservables[0]?.areaComunId ?? null

  const areaListadoFiltro = filtroAreaId ? Number(filtroAreaId) : undefined

  const {
    eventos: eventosCalendario,
    loading: loadingCalendario,
    error: calendarioError,
  } = useReservacionesCalendario(areaCalendarioEfectiva, weekStart)

  const { data: paginaAdmin, loading: loadingListado, error: listadoError } = useReservacionesAdmin(
    {
      areaComunId: areaListadoFiltro && areaListadoFiltro > 0 ? areaListadoFiltro : undefined,
      pagina,
      tamano: 20,
    },
    tab === 'listado',
  )

  useQueryErrorToast(areasError)
  useQueryErrorToast(calendarioError, tab === 'calendario')
  useQueryErrorToast(listadoError, tab === 'listado')

  const totalPaginas = paginaAdmin
    ? Math.max(1, Math.ceil(paginaAdmin.total / 20))
    : 1

  return (
    <main className="cq-admin-page">
      <PageHeader
        title="Áreas y reservas"
        description="Calendario comunitario y listado de reservaciones del condominio (solo lectura)."
      />

      <div className="mb-4 flex gap-2 border-b border-neutral-100" role="tablist" aria-label="Vista admin reservas">
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
          aria-selected={tab === 'listado'}
          className={`cursor-pointer px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'listado' ? 'border-primary text-primary' : 'border-transparent text-neutral-600'
          }`}
          onClick={() => setTab('listado')}
        >
          Listado condominio
        </button>
      </div>

      {tab === 'calendario' ? (
        <section className="space-y-4">
          {areasReservables.length === 0 ? (
            <p className="text-neutral">No hay áreas reservables registradas.</p>
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
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <label className="block text-sm font-medium text-neutral-700">
              Filtrar por área
              <select
                className="mt-1 block min-w-[12rem] rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={filtroAreaId}
                onChange={(e) => {
                  setFiltroAreaId(e.target.value)
                  setPagina(1)
                }}
              >
                <option value="">Todas</option>
                {areas.map((a) => (
                  <option key={a.areaComunId} value={a.areaComunId}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loadingListado ? (
            <div className="space-y-2" aria-label="Cargando reservaciones">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-neutral-100 rounded animate-pulse" />
              ))}
            </div>
          ) : !paginaAdmin || paginaAdmin.items.length === 0 ? (
            <p className="text-neutral">No hay reservaciones que coincidan con el filtro.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left border">
                  <thead className="bg-surface text-neutral uppercase text-xs">
                    <tr>
                      <th className="px-4 py-2">Área</th>
                      <th className="px-4 py-2">Residente</th>
                      <th className="px-4 py-2">Inicio</th>
                      <th className="px-4 py-2">Fin</th>
                      <th className="px-4 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginaAdmin.items.map((r) => (
                      <tr key={r.reservacionAreaId} className="hover:bg-surface">
                        <td className="px-4 py-2 font-medium min-w-0 break-words">{r.areaComun}</td>
                        <td className="px-4 py-2 min-w-0">
                          <div className="break-words">{r.usuarioNombre}</div>
                          <div className="text-xs text-neutral break-all">{r.usuarioCorreo}</div>
                        </td>
                        <td className="px-4 py-2 tabular-nums whitespace-nowrap">
                          {new Date(r.fechaInicio).toLocaleString('es-MX')}
                        </td>
                        <td className="px-4 py-2 tabular-nums whitespace-nowrap">
                          {new Date(r.fechaFin).toLocaleString('es-MX')}
                        </td>
                        <td className="px-4 py-2">{estadoBadge(r.estado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-neutral tabular-nums">
                  {paginaAdmin.total} reservación{paginaAdmin.total === 1 ? '' : 'es'}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pagina <= 1}
                    className="cursor-pointer rounded border px-3 py-1 disabled:opacity-50"
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </button>
                  <span className="tabular-nums self-center">
                    Página {pagina} / {totalPaginas}
                  </span>
                  <button
                    type="button"
                    disabled={pagina >= totalPaginas}
                    className="cursor-pointer rounded border px-3 py-1 disabled:opacity-50"
                    onClick={() => setPagina((p) => p + 1)}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </main>
  )
}
