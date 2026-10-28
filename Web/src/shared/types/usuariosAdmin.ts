export type UsuarioPadronItem = {
  usuarioId: number
  nombre: string
  correo: string
  telefono?: string | null
  perfil: string
  bActivo: boolean
}

export type UsuarioCreado = {
  usuarioId: number
  passwordTemporal: string
}

export type CasaListItem = {
  casaId: number
  condominioId: number
  condominioNombre?: string | null
  direccion?: string | null
  numero?: string | null
}
