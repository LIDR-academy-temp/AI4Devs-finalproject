import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '../../shared/lib/apiClient'
import type { ArticuloListItem, CategoriaDto, PrestamoListItem } from '../../shared/types/almacen'
import {
  normalizeArticulo,
  normalizeCategoria,
  normalizePrestamo,
} from './almacenMappers'

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
      setArticulos(data.map((row) => normalizeArticulo(row)))
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, problem, status } = await apiGet<CategoriaDto[]>('/WMS/Articulos/categorias')
    if (!data) {
      setError(problem?.detail ?? `Error ${status}`)
      setCategorias([])
    } else {
      setCategorias(data.map((row) => normalizeCategoria(row)))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  return { categorias, loading, error, recargar }
}

export function usePrestamos(enabled = true) {
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
      setPrestamos(data.map((row) => normalizePrestamo(row)))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!enabled) return
    void cargar()
  }, [cargar, enabled])

  return { prestamos, loading, error, recargar: cargar }
}
