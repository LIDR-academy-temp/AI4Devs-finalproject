import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../../shared/lib/apiClient'
import type { ReservacionCalendarioEvento } from '../../shared/types/visitas'
import { endOfWeekExclusive } from './reservasCalendarioUtils'

export function useReservacionesCalendario(areaComunId: number | null, weekStartMonday: Date) {
  const [eventos, setEventos] = useState<ReservacionCalendarioEvento[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCalendario = useCallback(async () => {
    if (areaComunId === null || areaComunId <= 0) {
      setEventos([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    const desdeDate = new Date(
      weekStartMonday.getFullYear(),
      weekStartMonday.getMonth(),
      weekStartMonday.getDate(),
      0,
      0,
      0,
      0,
    )
    const hastaDate = endOfWeekExclusive(weekStartMonday)
    const qs = new URLSearchParams({
      areaComunId: String(areaComunId),
      desde: desdeDate.toISOString(),
      hasta: hastaDate.toISOString(),
    })
    const { data, problem, status } = await apiGet<ReservacionCalendarioEvento[]>(
      `/VTS/ReservacionesArea/calendario?${qs.toString()}`,
    )
    if (!data || status !== 200) {
      setError(problem?.detail ?? 'Error al cargar calendario')
      setEventos([])
    } else {
      setEventos(data)
    }
    setLoading(false)
  }, [areaComunId, weekStartMonday])

  useEffect(() => {
    void fetchCalendario()
  }, [fetchCalendario])

  return { eventos, loading, error, refetch: fetchCalendario }
}
