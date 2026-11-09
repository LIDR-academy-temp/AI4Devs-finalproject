import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../../../shared/lib/apiClient'
import type { TipoPreguntaItem } from '../../../shared/types/encuestas'
import { normalizeTipoPreguntaList } from './encuestaMappers'

/** Alineado con catálogo enc.TiposPregunta (incl. legacy + DB-004). */
export const TIPOS_PREGUNTA_FALLBACK: TipoPreguntaItem[] = [
  { tipoPreguntaId: 1, tipoPregunta: 'Texto libre' },
  { tipoPreguntaId: 2, tipoPregunta: 'Opción única' },
  { tipoPreguntaId: 3, tipoPregunta: 'Múltiple opción' },
  { tipoPreguntaId: 4, tipoPregunta: 'Escala (1-5)' },
  { tipoPreguntaId: 5, tipoPregunta: 'Sí / No' },
  { tipoPreguntaId: 6, tipoPregunta: 'Opción múltiple' },
]

export function useTiposPregunta() {
  const [tipos, setTipos] = useState<TipoPreguntaItem[]>(TIPOS_PREGUNTA_FALLBACK)

  const refetch = useCallback(async () => {
    try {
      const res = await apiGet<unknown>('/ENC/TiposPregunta')
      const normalized = res.data ? normalizeTipoPreguntaList(res.data) : []
      if (normalized.length > 0) {
        setTipos(normalized)
      }
    } catch {
      setTipos(TIPOS_PREGUNTA_FALLBACK)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { tipos, refetch }
}
