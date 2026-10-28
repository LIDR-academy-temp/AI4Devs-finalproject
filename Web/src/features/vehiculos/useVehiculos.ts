import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '../../shared/lib/apiClient'
import type { AutomovilListItem, MarcaDto, ModeloDto } from '../../shared/types/vehiculos'
import {
  normalizeAutomovilListItem,
  normalizeMarca,
  normalizeModelo,
  type AutomovilListItemApiRow,
  type MarcaApiRow,
  type ModeloApiRow,
} from './vehiculoMappers'

export function useVehiculos() {
  const [vehiculos, setVehiculos] = useState<AutomovilListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVehiculos = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, problem, status } = await apiGet<AutomovilListItemApiRow[]>('/USR/Automoviles')
    if (!data) {
      setError(problem?.detail ?? `Error ${status}`)
      setVehiculos([])
    } else {
      setVehiculos(data.map(normalizeAutomovilListItem))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchVehiculos()
  }, [fetchVehiculos])

  return { vehiculos, loading, error, refetch: fetchVehiculos }
}

export function useMarcas() {
  const [marcas, setMarcas] = useState<MarcaDto[]>([])
  useEffect(() => {
    void apiGet<MarcaApiRow[]>('/USR/Marcas').then(({ data }) => {
      if (data) setMarcas(data.map(normalizeMarca))
    })
  }, [])
  return { marcas }
}

export function useModelos() {
  const [modelos, setModelos] = useState<ModeloDto[]>([])
  useEffect(() => {
    void apiGet<ModeloApiRow[]>('/USR/Modelos').then(({ data }) => {
      if (data) setModelos(data.map(normalizeModelo))
    })
  }, [])
  return { modelos }
}
