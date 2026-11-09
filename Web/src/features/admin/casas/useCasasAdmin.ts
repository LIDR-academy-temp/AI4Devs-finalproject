import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../../../shared/lib/apiClient'
import type { CasaAdminItem, CondominioItem } from '../../../shared/types/casasAdmin'

function normalizeCasa(raw: unknown): CasaAdminItem {
  const o = raw as Record<string, unknown>
  return {
    casaId: Number(o.casaId ?? o.CasaId),
    condominioId: Number(o.condominioId ?? o.CondominioId),
    condominioNombre: (o.condominioNombre ?? o.CondominioNombre) as string | null | undefined,
    direccion: (o.direccion ?? o.Direccion) as string | null | undefined,
    numero: (o.numero ?? o.Numero) as string | null | undefined,
    propietarioUsuarioId: (o.propietarioUsuarioId ?? o.PropietarioUsuarioId) as number | null | undefined,
    propietarioNombre: (o.propietarioNombre ?? o.PropietarioNombre) as string | null | undefined,
  }
}

export function useCasasAdmin(condominioId?: number) {
  const [casas, setCasas] = useState<CasaAdminItem[]>([])
  const [condominios, setCondominios] = useState<CondominioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (condominioId) params.set('condominioId', String(condominioId))
    const qs = params.toString()
    const casasPath = `/SGR/Casas${qs ? `?${qs}` : ''}`

    const [casasRes, condRes] = await Promise.all([
      apiGet<CasaAdminItem[]>(casasPath),
      apiGet<CondominioItem[]>('/SGR/Casas/condominios'),
    ])

    if (!casasRes.data) {
      setError(casasRes.problem?.detail ?? `Error ${casasRes.status}`)
      setCasas([])
    } else {
      setCasas(casasRes.data.map(normalizeCasa))
    }

    if (condRes.data) {
      setCondominios(condRes.data)
    }

    if (!casasRes.data) {
      setLoading(false)
      return
    }
    setError(null)
    setLoading(false)
  }, [condominioId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { casas, condominios, loading, error, refetch }
}
