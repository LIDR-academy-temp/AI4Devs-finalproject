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
  const ms = new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()
  return ms / 3_600_000 >= 23
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
