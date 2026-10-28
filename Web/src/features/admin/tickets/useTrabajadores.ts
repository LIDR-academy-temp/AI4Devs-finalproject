import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { apiGet } from '../../../shared/lib/apiClient'

export type TrabajadorItem = { id: number; nombre: string }

export function useTrabajadores() {
  const { session } = useAuth()
  const [items, setItems] = useState<TrabajadorItem[]>([])

  useEffect(() => {
    if (!session?.token) return
    void apiGet<TrabajadorItem[]>('/SGR/Usuarios/trabajadores', session.token).then((r) => {
      if (r.data) setItems(r.data)
    })
  }, [session?.token])

  return items
}
