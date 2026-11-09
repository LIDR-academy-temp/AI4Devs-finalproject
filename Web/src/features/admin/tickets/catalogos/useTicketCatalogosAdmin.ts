import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../auth/AuthContext'
import { apiGet } from '../../../../shared/lib/apiClient'
import type { CatalogoItem, PrioridadCatalogoItem } from '../../../../shared/types/tickets'

export function useTicketCatalogosAdmin() {
  const { session } = useAuth()
  const [categorias, setCategorias] = useState<CatalogoItem[]>([])
  const [prioridades, setPrioridades] = useState<PrioridadCatalogoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!session?.token) {
      return
    }
    setLoading(true)
    setError(null)
    const [catRes, priRes] = await Promise.all([
      apiGet<CatalogoItem[]>('/TKT/CategoriasTicket', session.token),
      apiGet<PrioridadCatalogoItem[]>('/TKT/PrioridadesTicket', session.token),
    ])
    if (!catRes.data || !priRes.data) {
      setError(catRes.problem?.detail ?? priRes.problem?.detail ?? 'No se pudieron cargar los catálogos')
      setCategorias(catRes.data ?? [])
      setPrioridades(priRes.data ?? [])
    } else {
      setCategorias(catRes.data)
      setPrioridades(priRes.data)
      setError(null)
    }
    setLoading(false)
  }, [session?.token])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { categorias, prioridades, loading, error, refetch }
}
