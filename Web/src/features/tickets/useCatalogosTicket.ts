import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { apiGet } from '../../shared/lib/apiClient'
import type { CatalogoItem, PrioridadCatalogoItem } from '../../shared/types/tickets'

export function useCatalogosTicket() {
  const { session } = useAuth()
  const [categorias, setCategorias] = useState<CatalogoItem[]>([])
  const [estados, setEstados] = useState<CatalogoItem[]>([])
  const [prioridades, setPrioridades] = useState<PrioridadCatalogoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.token) {
      return
    }

    let cancelled = false
    void (async () => {
      setLoading(true)
      const [catRes, estRes, priRes] = await Promise.all([
        apiGet<CatalogoItem[]>('/TKT/CategoriasTicket', session.token),
        apiGet<CatalogoItem[]>('/TKT/EstadosTickets', session.token),
        apiGet<PrioridadCatalogoItem[]>('/TKT/PrioridadesTicket', session.token),
      ])
      if (cancelled) {
        return
      }
      if (!catRes.data || !estRes.data || !priRes.data) {
        setError('No se pudieron cargar los catálogos')
      } else {
        setCategorias(catRes.data)
        setEstados(estRes.data)
        setPrioridades(priRes.data)
        setError(null)
      }
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [session?.token])

  return { categorias, estados, prioridades, loading, error }
}
