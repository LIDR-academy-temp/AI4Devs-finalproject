/** Lunes 00:00 local de la semana que contiene `date`. */
export function startOfWeekMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function endOfWeekExclusive(weekStartMonday: Date): Date {
  return addDays(weekStartMonday, 7)
}

export function isDiaCompleto(fechaInicio: string, fechaFin: string): boolean {
  const start = new Date(fechaInicio)
  const end = new Date(fechaFin)
  if (start.getHours() !== 0 || start.getMinutes() !== 0 || start.getSeconds() !== 0) {
    return false
  }
  const ms = end.getTime() - start.getTime()
  return ms / 3_600_000 >= 23
}

/** Rango horario visible en la grilla (local), ampliado según eventos con hora. */
export function hourBoundsForCalendario(
  eventos: { fechaInicio: string; fechaFin: string }[],
  defaultStart = 8,
  defaultEndExclusive = 22,
): { hourStart: number; hourEndExclusive: number } {
  let hourStart = defaultStart
  let hourEndExclusive = defaultEndExclusive

  for (const e of eventos) {
    if (isDiaCompleto(e.fechaInicio, e.fechaFin)) continue
    const s = new Date(e.fechaInicio)
    const f = new Date(e.fechaFin)
    hourStart = Math.min(hourStart, s.getHours())
    const endSlot =
      f.getMinutes() > 0 || f.getSeconds() > 0 || f.getMilliseconds() > 0 ? f.getHours() + 1 : f.getHours()
    hourEndExclusive = Math.max(hourEndExclusive, endSlot)
  }

  hourStart = Math.max(0, hourStart)
  hourEndExclusive = Math.min(24, Math.max(hourEndExclusive, hourStart + 1))
  return { hourStart, hourEndExclusive }
}

export function dayIndexInWeek(weekStartMonday: Date, instant: Date): number {
  const dayStart = new Date(instant.getFullYear(), instant.getMonth(), instant.getDate())
  const weekStart = new Date(
    weekStartMonday.getFullYear(),
    weekStartMonday.getMonth(),
    weekStartMonday.getDate(),
  )
  return Math.round((dayStart.getTime() - weekStart.getTime()) / 86_400_000)
}
