import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPost } from '../../shared/lib/apiClient'
import type { CrearPaseRequest, PaseVisita, ValidarPaseResponse, UsarPaseResponse } from '../../shared/types/visitasPase'

export function useMisPases() {
  const [pases, setPases] = useState<PaseVisita[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, problem, status } = await apiGet<PaseVisita[]>('/VTS/VisitasGeneradas/mias')
    if (!data) {
      setPases([])
      setError(problem?.detail ?? `Error ${status}`)
    } else {
      setPases(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { pases, loading, error, refetch }
}

export async function crearPase(body: CrearPaseRequest) {
  return apiPost<PaseVisita>('/VTS/VisitasGeneradas', body)
}

export async function validarPase(codigoQr: string) {
  return apiPost<ValidarPaseResponse>('/VTS/VisitasGeneradas/validar', { codigoQr })
}

export async function usarPase(visitaGeneradaId: number) {
  return apiPost<UsarPaseResponse>(`/VTS/VisitasGeneradas/${visitaGeneradaId}/usar`, {})
}
