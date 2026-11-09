import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getDashboardResumen } from './dashboard.api'
import type { DashboardResumen } from '../../shared/types/dashboard'

export function useDashboardResumen() {
  const { session } = useAuth()
  const [data, setData] = useState<DashboardResumen | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!session?.token) return
    setLoading(true)
    setError(null)
    const { data: resumen, problem, status } = await getDashboardResumen(session.token)
    if (status !== 200 || !resumen) {
      setData(null)
      setError(problem?.detail ?? 'No se pudo cargar el resumen')
    } else {
      setData(resumen)
    }
    setLoading(false)
  }, [session?.token])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
