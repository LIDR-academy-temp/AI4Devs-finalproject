import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPatch, apiPost, apiPut, apiDelete } from '../../shared/lib/apiClient'
import type { AnuncioItem, TipoAnuncioItem } from '../../shared/types/anuncios'

export function useAnunciosResidente() {
  const [data, setData] = useState<AnuncioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    const { data: list, problem, status } = await apiGet<AnuncioItem[]>('/ANM/Anuncios')
    if (!list) {
      setError(problem?.detail ?? `Error ${status}`)
      setData([])
    } else {
      setData(list)
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}

export function useAnuncioDetalle(id: number) {
  const [item, setItem] = useState<AnuncioItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const { data, problem, status } = await apiGet<AnuncioItem>(`/ANM/Anuncios/${id}`)
      if (!data) {
        setError(problem?.detail ?? `Error ${status}`)
        setItem(null)
        setLoading(false)
        return
      }
      setItem(data)
      const patch = await apiPatch(`/ANM/Anuncios/${id}/visto`, {})
      if (patch.status !== 204 && patch.status !== 200) {
        setError(patch.problem?.detail ?? `No se registró la lectura (${patch.status})`)
      } else {
        setError(null)
      }
      setLoading(false)
    })()
  }, [id])

  return { item, loading, error }
}

export function useAnunciosAdmin() {
  const [data, setData] = useState<AnuncioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    const { data: list, problem, status } = await apiGet<AnuncioItem[]>(
      '/ANM/Anuncios?incluirNoVigentes=true',
    )
    if (!list) {
      setError(problem?.detail ?? `Error ${status}`)
      setData([])
    } else {
      setData(list)
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}

export function useTiposAnuncio() {
  const [tipos, setTipos] = useState<TipoAnuncioItem[]>([])
  useEffect(() => {
    void (async () => {
      const { data } = await apiGet<TipoAnuncioItem[]>('/ANM/TiposAnuncio')
      if (data) setTipos(data)
    })()
  }, [])
  return tipos
}

export async function crearAnuncio(body: {
  titulo: string
  contenido: string
  tipoAnuncio: string
  vigenteHasta?: string | null
}) {
  return apiPost<AnuncioItem>('/ANM/Anuncios', body)
}

export async function actualizarAnuncio(
  id: number,
  body: { titulo?: string; contenido?: string; tipoAnuncio?: string; vigenteHasta?: string | null },
) {
  return apiPut<AnuncioItem>(`/ANM/Anuncios/${id}`, body)
}

export async function eliminarAnuncio(id: number) {
  return apiDelete(`/ANM/Anuncios/${id}`)
}
