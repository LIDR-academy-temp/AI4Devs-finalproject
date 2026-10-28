import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../../shared/lib/apiClient'
import type { MascotaListItem, TipoMascotaDto, RazaMascotaDto } from '../../shared/types/mascotas'

export function useMascotas() {
  const [mascotas, setMascotas] = useState<MascotaListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    const { data, problem, status } = await apiGet<MascotaListItem[]>('/USR/Mascotas')
    if (!data || status !== 200) {
      setError(problem?.detail ?? 'Error al cargar mascotas')
      setMascotas([])
    } else {
      setMascotas(data)
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
    apiGet<TipoMascotaDto[]>('/USR/TiposMascota').then((r) => setTipos(r.data ?? []))
  }, [])
  return tipos
}

export function useRazasMascota() {
  const [razas, setRazas] = useState<RazaMascotaDto[]>([])
  useEffect(() => {
    apiGet<RazaMascotaDto[]>('/USR/RazasMascota').then((r) => setRazas(r.data ?? []))
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
    const { data, problem, status } = await apiGet<MascotaListItem[]>('/USR/Mascotas/padron')
    if (!data) {
      setError(problem?.detail ?? `Error ${status}`)
      setPadron([])
    } else {
      setPadron(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  return { padron, loading, error, reload }
}
