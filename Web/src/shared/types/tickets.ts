export type CatalogoItem = { id: number; nombre: string }

export type PrioridadCatalogoItem = { id: number; nombre: string; orden?: number | null }

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

export type TicketDetalle = {
  ticketId: number
  titulo: string
  descripcion: string
  estado: string
  prioridad: string
  categoria: string | null
  fechaCreacion: string
  fechaCierre: string | null
}

export type ComentarioTicket = {
  comentarioTicketId: number
  comentario: string
  fechaComentario: string
  autorNombre: string
  esInterno: boolean
}

export type CrearComentarioInput = {
  comentario: string
  esInterno?: boolean
}

export type CrearTicketPayload = {
  crearTicket: {
    ticket: TicketCreated | null
    errors: UserError[] | null
  }
}
