import { useCallback, useEffect, useState } from 'react'
import { apiDelete, apiGet, apiPost, apiPut } from '../../shared/lib/apiClient'
import type {
  CrearPaseAdminRequest,
  CrearPaseRequest,
  PaseVisita,
  ValidarPaseResponse,
  UsarPaseResponse,
} from '../../shared/types/visitasPase'

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

export async function crearPaseAdmin(body: CrearPaseAdminRequest) {
  return apiPost<PaseVisita>('/VTS/VisitasGeneradas/admin', body)
}

export async function actualizarPaseAdmin(visitaGeneradaId: number, body: CrearPaseAdminRequest) {
  return apiPut<PaseVisita>(`/VTS/VisitasGeneradas/admin/${visitaGeneradaId}`, body)
}

export async function cancelarPaseAdmin(visitaGeneradaId: number) {
  return apiDelete(`/VTS/VisitasGeneradas/admin/${visitaGeneradaId}`)
}

export async function validarPase(codigoQr: string) {
  return apiPost<ValidarPaseResponse>('/VTS/VisitasGeneradas/validar', { codigoQr })
}

export async function usarPase(visitaGeneradaId: number) {
  return apiPost<UsarPaseResponse>(`/VTS/VisitasGeneradas/${visitaGeneradaId}/usar`, {})
}

export type AdminPasesFiltro = {
  casaId?: number
  desde?: string
  hasta?: string
}

function adminPasesQuery(filtro?: AdminPasesFiltro) {
  const q = new URLSearchParams()
  if (filtro?.casaId && filtro.casaId > 0) q.set('casaId', String(filtro.casaId))
  if (filtro?.desde) q.set('desde', filtro.desde)
  if (filtro?.hasta) q.set('hasta', filtro.hasta)
  const s = q.toString()
  return s ? `/VTS/VisitasGeneradas/admin?${s}` : '/VTS/VisitasGeneradas/admin'
}

export function useAdminPases(filtro?: AdminPasesFiltro) {
  const [pases, setPases] = useState<PaseVisita[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, problem, status } = await apiGet<PaseVisita[]>(adminPasesQuery(filtro))
    if (!data) {
      setPases([])
      setError(problem?.detail ?? `Error ${status}`)
    } else {
      setPases(data)
    }
    setLoading(false)
  }, [filtro?.casaId, filtro?.desde, filtro?.hasta])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { pases, loading, error, refetch }
}
