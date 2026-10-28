import { apiGet, apiPatch } from '../../shared/lib/apiClient'
import type { NotificacionBandeja } from '../../shared/types/notifications'

export async function fetchNotificaciones(token: string, pagina = 1, tamano = 20) {
  return apiGet<NotificacionBandeja>(
    `/NTF/Notificaciones?pagina=${pagina}&tamano=${tamano}`,
    token,
  )
}

export async function marcarNotificacionLeida(token: string, notificacionId: number) {
  return apiPatch<void>(`/NTF/Notificaciones/${notificacionId}/leida`, undefined, token)
}
