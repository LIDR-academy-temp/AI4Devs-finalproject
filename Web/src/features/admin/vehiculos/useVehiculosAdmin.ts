import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../../../shared/lib/apiClient'
import type { AutomovilListItem } from '../../../shared/types/vehiculos'
import { normalizeAutomovilListItem, type AutomovilListItemApiRow } from '../../vehiculos/vehiculoMappers'

export function useVehiculosPadron() {
  const [vehiculos, setVehiculos] = useState<AutomovilListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, problem, status } = await apiGet<AutomovilListItemApiRow[]>('/USR/Automoviles/padron')
    if (!data) {
      setError(problem?.detail ?? `Error ${status}`)
      setVehiculos([])
    } else {
      setVehiculos(data.map(normalizeAutomovilListItem))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { vehiculos, loading, error, refetch }
}

export async function buscarVehiculosPorPlacas(placas: string) {
  const q = encodeURIComponent(placas.trim().toUpperCase())
  const res = await apiGet<AutomovilListItemApiRow[]>(`/USR/Automoviles/buscar?placas=${q}`)
  return { ...res, data: res.data?.map(normalizeAutomovilListItem) }
}
