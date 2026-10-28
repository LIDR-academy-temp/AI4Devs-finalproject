export interface MascotaListItem {
  mascotaId: number
  usuarioId: number
  nombreUsuario?: string
  correoUsuario?: string
  nombreMascota: string
  tipoMascotaId?: number
  tipoMascota?: string
  razaMascotaId?: number
  razaMascota?: string
  razaLibre?: string
  vacunasAlDia?: boolean
  fechaUltimaVacuna?: string
  fechaNacimiento?: string
  numeroCasa?: string
}

export interface TipoMascotaDto {
  tipoMascotaId: number
  tipoMascota: string
}

export interface RazaMascotaDto {
  razaMascotaId: number
  razaMascota: string
  tipoMascotaId: number
}

export interface MascotaCrearRequest {
  nombreMascota: string
  tipoMascotaId?: number
  razaMascotaId?: number
  razaLibre?: string
  vacunasAlDia?: boolean
  fechaUltimaVacuna?: string
  fechaNacimiento?: string
}

export interface MascotaActualizarRequest {
  nombreMascota?: string
  tipoMascotaId?: number
  razaMascotaId?: number
  razaLibre?: string
  vacunasAlDia?: boolean
  fechaUltimaVacuna?: string
  fechaNacimiento?: string
}
