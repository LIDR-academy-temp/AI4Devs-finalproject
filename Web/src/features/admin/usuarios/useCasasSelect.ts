import { useEffect, useState } from 'react'
import { apiGet } from '../../../shared/lib/apiClient'
import type { CasaListItem } from '../../../shared/types/usuariosAdmin'

export function useCasasSelect() {
  const [casas, setCasas] = useState<CasaListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const { data, problem, status } = await apiGet<CasaListItem[]>('/SGR/Casas')
      if (!data) {
        setError(problem?.detail ?? `Error ${status}`)
        setCasas([])
      } else {
        setCasas(data)
        setError(null)
      }
      setLoading(false)
    })()
  }, [])

  return { casas, loading, error }
}
