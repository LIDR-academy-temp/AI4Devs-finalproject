export type CatalogoItem = { id: number; nombre: string }

export type MiTicketItem = {
  ticketId: number
  titulo: string
  estado: string
  prioridad: string
  categoria: string | null
  fechaCreacion: string
}

export type PaginaMisTickets = {
  total: number
  pagina: number
  items: MiTicketItem[]
}

export type CrearTicketInput = {
  titulo: string
  descripcion: string
  categoria: string
  prioridad?: string
}

export type UserError = {
  message: string
  code: string
  field?: string | null
}

export type TicketCreated = {
  id: number
  titulo: string
  estado: string
  prioridad: string
  categoria?: string | null
  canal?: string | null
  fechaCreacion: string
}

export type CrearTicketPayload = {
  crearTicket: {
    ticket: TicketCreated | null
    errors: UserError[] | null
  }
}
