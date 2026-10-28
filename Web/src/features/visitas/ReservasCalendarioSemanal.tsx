import { addDays, dayIndexInWeek, isDiaCompleto, startOfWeekMonday } from './reservasCalendarioUtils'
import type { ReservacionCalendarioEvento } from '../../shared/types/visitas'

const HOUR_START = 8
const HOUR_END = 22

const LEGEND = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
} as const

function estadoBlockClass(estado: string): string {
  if (estado === 'Confirmada') return 'bg-success-light border-success text-success'
  if (estado === 'Pendiente') return 'bg-warning-light border-warning text-warning'
  return 'bg-surface-alt border-neutral-200 text-neutral-700'
}

function formatWeekLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6)
  const fmt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${weekStart.toLocaleDateString('es-MX', fmt)} – ${end.toLocaleDateString('es-MX', fmt)}`
}

export interface ReservasCalendarioSemanalProps {
  areaComunId: number
  weekStart: Date
  onWeekChange: (next: Date) => void
  eventos: ReservacionCalendarioEvento[]
  loading: boolean
}

export function ReservasCalendarioSemanal({
  areaComunId,
  weekStart,
  onWeekChange,
  eventos,
  loading,
}: ReservasCalendarioSemanalProps) {
  const weekStartNorm = startOfWeekMonday(weekStart)
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStartNorm, i)
    return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })
  })

  const allDay = eventos.filter((e) => isDiaCompleto(e.fechaInicio, e.fechaFin))
  const timed = eventos.filter((e) => !isDiaCompleto(e.fechaInicio, e.fechaFin))

  return (
    <div className="space-y-3" aria-labelledby="calendario-reservas-titulo">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="calendario-reservas-titulo" className="text-base font-semibold text-neutral-800">
          Semana {formatWeekLabel(weekStartNorm)}
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            className="cursor-pointer rounded border px-2 py-1 text-sm hover:bg-surface"
            onClick={() => onWeekChange(addDays(weekStartNorm, -7))}
          >
            ← Anterior
          </button>
          <button
            type="button"
            className="cursor-pointer rounded border px-2 py-1 text-sm hover:bg-surface"
            onClick={() => onWeekChange(addDays(weekStartNorm, 7))}
          >
            Siguiente →
          </button>
        </div>
      </div>

      <ul className="flex flex-wrap gap-3 text-xs text-neutral-600" aria-label="Leyenda de estados">
        <li className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-warning-light border border-warning" />
          {LEGEND.pendiente}
        </li>
        <li className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-success-light border border-success" />
          {LEGEND.confirmada}
        </li>
      </ul>

      {loading ? (
        <div className="h-48 animate-pulse rounded-lg bg-neutral-100" aria-label="Cargando calendario" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-100">
          <div
            className="grid min-w-[640px]"
            style={{ gridTemplateColumns: '3rem repeat(7, minmax(0, 1fr))' }}
          >
            <div className="border-b bg-surface p-1 text-xs font-medium text-neutral-500">Todo el día</div>
            {dayLabels.map((label) => (
              <div key={label} className="border-b border-l bg-surface p-1 text-center text-xs font-medium text-neutral-600">
                {label}
              </div>
            ))}
            <div className="p-1 text-[10px] text-neutral-400" />
            {Array.from({ length: 7 }, (_, col) => (
              <div key={`allday-${col}`} className="min-h-[2.5rem] border-l border-b p-0.5 space-y-0.5">
                {allDay
                  .filter((e) => dayIndexInWeek(weekStartNorm, new Date(e.fechaInicio)) === col)
                  .map((e) => (
                    <div
                      key={e.reservacionAreaId}
                      data-testid="calendario-evento"
                      className={`rounded border px-1 py-0.5 text-[10px] truncate ${estadoBlockClass(e.estado)}`}
                      title={e.etiqueta}
                    >
                      {e.etiqueta}
                    </div>
                  ))}
              </div>
            ))}

            {Array.from({ length: HOUR_END - HOUR_START }, (_, row) => {
              const hour = HOUR_START + row
              return (
                <div key={`row-${hour}`} className="contents">
                  <div className="border-b p-1 text-[10px] text-neutral-400 tabular-nums">{hour}:00</div>
                  {Array.from({ length: 7 }, (_, col) => (
                    <div key={`cell-${hour}-${col}`} className="relative min-h-[2rem] border-l border-b p-0.5">
                      {timed
                        .filter((e) => {
                          const slotStart = new Date(weekStartNorm)
                          slotStart.setDate(slotStart.getDate() + col)
                          slotStart.setHours(hour, 0, 0, 0)
                          const slotEnd = new Date(slotStart)
                          slotEnd.setHours(hour + 1, 0, 0, 0)
                          const evStart = new Date(e.fechaInicio)
                          const evEnd = new Date(e.fechaFin)
                          return evStart < slotEnd && evEnd > slotStart
                        })
                        .map((e) => (
                          <div
                            key={e.reservacionAreaId}
                            data-testid="calendario-evento"
                            className={`rounded border px-1 text-[10px] leading-tight ${estadoBlockClass(e.estado)}`}
                            title={`${e.etiqueta} · ${new Date(e.fechaInicio).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`}
                          >
                            {new Date(e.fechaInicio).toLocaleTimeString('es-MX', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}
      <p className="sr-only">Área seleccionada {areaComunId}</p>
    </div>
  )
}
