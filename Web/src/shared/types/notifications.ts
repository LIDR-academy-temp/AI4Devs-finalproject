export type NotificacionItem = {
  notificacionId: number
  titulo: string
  mensaje: string
  tipo: string
  fechaCreacion: string
  leida: boolean
}

export type NotificacionBandeja = {
  items: NotificacionItem[]
  pagina: number
  tamano: number
  totalNoLeidas: number
}
