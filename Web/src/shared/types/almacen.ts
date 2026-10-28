export interface ArticuloListItem {
  articuloId: number
  nombre: string
  categoriaId?: number
  categoria?: string
  stock: number
  stockMinimo: number
  bajoMinimo: boolean
  ubicacion?: string
}

export interface ArticuloDetalle extends ArticuloListItem {
  fechaCreacion?: string
  fechaModificacion?: string
}

export interface CategoriaDto {
  categoriaId: number
  nombre: string
}

export interface ArticuloCrearRequest {
  nombre: string
  categoriaId?: number
  stock: number
  stockMinimo: number
  ubicacion?: string
}

export interface ArticuloActualizarRequest {
  nombre?: string
  categoriaId?: number
  stock?: number
  stockMinimo?: number
  ubicacion?: string
}

export interface PrestamoListItem {
  prestamoId: number
  articuloId: number
  nombreArticulo: string
  usuarioId: number
  nombreUsuario?: string
  correoUsuario?: string
  cantidad: number
  fechaPrestamo: string
  fechaDevolucion?: string
  estado: 'PRESTADO' | 'DEVUELTO'
  notas?: string
}

export interface PrestamoCrearRequest {
  articuloId: number
  usuarioId: number
  cantidad: number
  notas?: string
}
