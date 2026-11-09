import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../../../shared/lib/apiClient'
import type { MarcaDto, ModeloDto } from '../../../shared/types/vehiculos'
import {
  normalizeMarca,
  normalizeModelo,
  type MarcaApiRow,
  type ModeloApiRow,
} from '../../vehiculos/vehiculoMappers'

export function useMarcasCatalog() {
  const [marcas, setMarcas] = useState<MarcaDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, problem, status } = await apiGet<MarcaApiRow[]>('/USR/Marcas')
    if (!data) {
      setError(problem?.detail ?? `Error ${status}`)
      setMarcas([])
    } else {
      setMarcas(data.map(normalizeMarca))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { marcas, loading, error, reload }
}

export function useModelosCatalog() {
  const [modelos, setModelos] = useState<ModeloDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, problem, status } = await apiGet<ModeloApiRow[]>('/USR/Modelos')
    if (!data) {
      setError(problem?.detail ?? `Error ${status}`)
      setModelos([])
    } else {
      setModelos(data.map(normalizeModelo))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { modelos, loading, error, reload }
}
