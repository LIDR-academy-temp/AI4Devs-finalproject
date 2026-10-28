export type TicketsPorCanal = {
  web: number
  telegram: number
}

export type ResumenAdmin = {
  tipo: 'ADMIN'
  ticketsNuevos: number
  ticketsEnSeguimiento: number
  morososMes: number
  montoCobrado: number
  montoPendiente: number
  ocupacion: number
  ticketsPorCanal: TicketsPorCanal
}

export type EstadoCuotaMes = {
  monto: number
  fechaVencimiento: string
  estado: 'Pagada' | 'Pendiente' | 'Vencida'
}

export type ResumenResidente = {
  tipo: 'RESIDENTE'
  ticketsActivos: number
  estadoCuotaMes: EstadoCuotaMes | null
  notificacionesNoLeidas: number
  avisoVencida: boolean
}

export type DashboardResumen = ResumenAdmin | ResumenResidente
