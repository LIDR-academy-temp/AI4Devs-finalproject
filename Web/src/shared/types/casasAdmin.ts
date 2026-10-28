export type CondominioItem = {
  condominioId: number
  nombre: string
  direccion?: string | null
}

export type CasaAdminItem = {
  casaId: number
  condominioId: number
  condominioNombre?: string | null
  direccion?: string | null
  numero?: string | null
  propietarioUsuarioId?: number | null
  propietarioNombre?: string | null
}
