import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../../shared/lib/apiClient'
import type { MascotaListItem, TipoMascotaDto, RazaMascotaDto } from '../../shared/types/mascotas'
import {
  normalizeMascotaListItem,
  normalizeRazaMascota,
  normalizeTipoMascota,
  type MascotaListItemApiRow,
  type RazaMascotaApiRow,
  type TipoMascotaApiRow,
} from './mascotaMappers'

export function useMascotas() {
  const [mascotas, setMascotas] = useState<MascotaListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    const { data, problem, status } = await apiGet<MascotaListItemApiRow[]>('/USR/Mascotas')
    if (!data || status !== 200) {
      setError(problem?.detail ?? 'Error al cargar mascotas')
      setMascotas([])
    } else {
      setMascotas(data.map(normalizeMascotaListItem))
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  return { mascotas, loading, error, reload }
}

export function useTiposMascota() {
  const [tipos, setTipos] = useState<TipoMascotaDto[]>([])
  useEffect(() => {
    apiGet<TipoMascotaApiRow[]>('/USR/TiposMascota').then((r) =>
      setTipos((r.data ?? []).map(normalizeTipoMascota)),
    )
  }, [])
  return tipos
}

export function useRazasMascota() {
  const [razas, setRazas] = useState<RazaMascotaDto[]>([])
  useEffect(() => {
    apiGet<RazaMascotaApiRow[]>('/USR/RazasMascota').then((r) =>
      setRazas((r.data ?? []).map(normalizeRazaMascota)),
    )
  }, [])
  return razas
}

export function usePadronMascotas() {
  const [padron, setPadron] = useState<MascotaListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, problem, status } = await apiGet<MascotaListItemApiRow[]>('/USR/Mascotas/padron')
    if (!data) {
      setError(problem?.detail ?? `Error ${status}`)
      setPadron([])
    } else {
      setPadron(data.map(normalizeMascotaListItem))
    }
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  return { padron, loading, error, reload }
}
