export interface AutomovilListItem {
  automovilId: number
  usuarioId: number
  nombreUsuario?: string
  correoUsuario?: string
  marcaId?: number
  marca?: string
  modeloId?: number
  modelo?: string
  modeloLibre?: string
  placas?: string
  color?: string
  numeroCasa?: string
}

export interface MarcaDto {
  marcaId: number
  marca: string
}

export interface ModeloDto {
  modeloId: number
  modelo: string
  marcaId: number
}

export interface AutomovilCrearRequest {
  marcaId?: number
  modeloId?: number
  modeloLibre?: string
  placas: string
  color?: string
}

export interface AutomovilCrearAdminRequest extends AutomovilCrearRequest {
  usuarioId: number
}

export interface AutomovilActualizarRequest {
  marcaId?: number
  modeloId?: number
  modeloLibre?: string
  placas?: string
  color?: string
}
