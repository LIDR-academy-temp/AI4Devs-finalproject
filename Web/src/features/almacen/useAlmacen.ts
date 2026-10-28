import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '../../shared/lib/apiClient'
import type { ArticuloListItem, CategoriaDto, PrestamoListItem } from '../../shared/types/almacen'

export function useArticulos() {
  const [articulos, setArticulos] = useState<ArticuloListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, problem, status } = await apiGet<ArticuloListItem[]>('/WMS/Articulos')
    if (!data) {
      setError(problem?.detail ?? `Error ${status}`)
      setArticulos([])
    } else {
      setArticulos(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  return { articulos, loading, error, recargar: cargar }
}

export function useCategorias() {
  const [categorias, setCategorias] = useState<CategoriaDto[]>([])

  useEffect(() => {
    void apiGet<CategoriaDto[]>('/WMS/Articulos/categorias').then(({ data }) => {
      if (data) setCategorias(data)
    })
  }, [])

  return { categorias }
}

export function usePrestamos() {
  const [prestamos, setPrestamos] = useState<PrestamoListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, problem, status } = await apiGet<PrestamoListItem[]>('/WMS/Prestamos')
    if (!data) {
      setError(problem?.detail ?? `Error ${status}`)
      setPrestamos([])
    } else {
      setPrestamos(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  return { prestamos, loading, error, recargar: cargar }
}
