import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getEstadoCuenta } from './finanzas.api'
import type { EstadoCuenta } from '../../shared/types/finanzas'

export function useEstadoCuenta() {
  const { session } = useAuth()
  const [data, setData] = useState<EstadoCuenta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!session?.token) return
    setLoading(true)
    setError(null)
    const { data: estado, problem, status } = await getEstadoCuenta(session.token)
    if (status !== 200 || !estado) {
      setError(problem?.detail ?? 'No se pudo cargar el estado de cuenta')
      setData(null)
    } else {
      setData(estado)
    }
    setLoading(false)
  }, [session?.token])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
