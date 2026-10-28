import type {
  ArticuloListItem,
  CategoriaDto,
  PrestamoListItem,
} from '../../shared/types/almacen'

type ArticuloApiRow = {
  articuloId?: number
  ArticuloId?: number
  nombre?: string
  Nombre?: string
  categoriaId?: number
  CategoriaId?: number
  categoria?: string
  Categoria?: string
  stock?: number
  Stock?: number
  stockMinimo?: number
  StockMinimo?: number
  bajoMinimo?: boolean
  BajoMinimo?: boolean
  ubicacion?: string
  Ubicacion?: string
}

type CategoriaApiRow = {
  categoriaId?: number
  CategoriaId?: number
  nombre?: string
  Nombre?: string
}

type PrestamoApiRow = {
  prestamoId?: number
  PrestamoId?: number
  articuloId?: number
  ArticuloId?: number
  nombreArticulo?: string
  NombreArticulo?: string
  usuarioId?: number
  UsuarioId?: number
  nombreUsuario?: string
  NombreUsuario?: string
  correoUsuario?: string
  CorreoUsuario?: string
  cantidad?: number
  Cantidad?: number
  fechaPrestamo?: string
  FechaPrestamo?: string
  fechaDevolucion?: string
  FechaDevolucion?: string
  estado?: string
  Estado?: string
  notas?: string
  Notas?: string
}

export function normalizeCategoria(row: CategoriaApiRow): CategoriaDto {
  return {
    categoriaId: row.categoriaId ?? row.CategoriaId ?? 0,
    nombre: row.nombre ?? row.Nombre ?? '',
  }
}

export function normalizeArticulo(row: ArticuloApiRow): ArticuloListItem {
  return {
    articuloId: row.articuloId ?? row.ArticuloId ?? 0,
    nombre: row.nombre ?? row.Nombre ?? '',
    categoriaId: row.categoriaId ?? row.CategoriaId,
    categoria: row.categoria ?? row.Categoria,
    stock: row.stock ?? row.Stock ?? 0,
    stockMinimo: row.stockMinimo ?? row.StockMinimo ?? 0,
    bajoMinimo: row.bajoMinimo ?? row.BajoMinimo ?? false,
    ubicacion: row.ubicacion ?? row.Ubicacion,
  }
}

export function normalizePrestamo(row: PrestamoApiRow): PrestamoListItem {
  const estado = (row.estado ?? row.Estado ?? 'PRESTADO') as PrestamoListItem['estado']
  return {
    prestamoId: row.prestamoId ?? row.PrestamoId ?? 0,
    articuloId: row.articuloId ?? row.ArticuloId ?? 0,
    nombreArticulo: row.nombreArticulo ?? row.NombreArticulo ?? '',
    usuarioId: row.usuarioId ?? row.UsuarioId ?? 0,
    nombreUsuario: row.nombreUsuario ?? row.NombreUsuario,
    correoUsuario: row.correoUsuario ?? row.CorreoUsuario,
    cantidad: row.cantidad ?? row.Cantidad ?? 0,
    fechaPrestamo: row.fechaPrestamo ?? row.FechaPrestamo ?? '',
    fechaDevolucion: row.fechaDevolucion ?? row.FechaDevolucion,
    estado,
    notas: row.notas ?? row.Notas,
  }
}
