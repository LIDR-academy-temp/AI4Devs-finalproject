import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '../../shared/lib/apiClient'
import type { ReservacionArea } from '../../shared/types/visitas'

export function useReservaciones() {
  const [reservaciones, setReservaciones] = useState<ReservacionArea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReservaciones = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, problem, status } = await apiGet<ReservacionArea[]>('/VTS/ReservacionesArea/mias')
    if (!data || status !== 200) {
      setError(problem?.detail ?? 'Error al cargar reservaciones')
      setReservaciones([])
    } else {
      setReservaciones(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchReservaciones()
  }, [fetchReservaciones])

  return { reservaciones, loading, error, refetch: fetchReservaciones }
}
