import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../../../shared/lib/apiClient'
import type { RazaMascotaDto, TipoMascotaDto } from '../../../shared/types/mascotas'
import {
  normalizeRazaMascota,
  normalizeTipoMascota,
  type RazaMascotaApiRow,
  type TipoMascotaApiRow,
} from '../../mascotas/mascotaMappers'

export function useTiposMascotaCatalog() {
  const [tipos, setTipos] = useState<TipoMascotaDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, problem, status } = await apiGet<TipoMascotaApiRow[]>('/USR/TiposMascota')
    if (!data) {
      setError(problem?.detail ?? `Error ${status}`)
      setTipos([])
    } else {
      setTipos(data.map(normalizeTipoMascota))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { tipos, loading, error, reload }
}

export function useRazasMascotaCatalog() {
  const [razas, setRazas] = useState<RazaMascotaDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, problem, status } = await apiGet<RazaMascotaApiRow[]>('/USR/RazasMascota')
    if (!data) {
      setError(problem?.detail ?? `Error ${status}`)
      setRazas([])
    } else {
      setRazas(data.map(normalizeRazaMascota))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { razas, loading, error, reload }
}
