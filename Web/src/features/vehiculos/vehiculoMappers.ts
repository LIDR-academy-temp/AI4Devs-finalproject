import type { AutomovilListItem, MarcaDto, ModeloDto } from '../../shared/types/vehiculos'

/** Fila REST USR: camelCase o PascalCase (API GraphApi PropertyNamingPolicy = null). */
export type AutomovilListItemApiRow = Partial<AutomovilListItem> & {
  AutomovilId?: number
  UsuarioId?: number
  NombreUsuario?: string
  CorreoUsuario?: string
  MarcaId?: number
  Marca?: string
  ModeloId?: number
  Modelo?: string
  ModeloLibre?: string
  Placas?: string
  Color?: string
  NumeroCasa?: string
}

export function normalizeAutomovilListItem(row: AutomovilListItemApiRow): AutomovilListItem {
  return {
    automovilId: row.automovilId ?? row.AutomovilId ?? 0,
    usuarioId: row.usuarioId ?? row.UsuarioId ?? 0,
    nombreUsuario: row.nombreUsuario ?? row.NombreUsuario,
    correoUsuario: row.correoUsuario ?? row.CorreoUsuario,
    marcaId: row.marcaId ?? row.MarcaId,
    marca: row.marca ?? row.Marca,
    modeloId: row.modeloId ?? row.ModeloId,
    modelo: row.modelo ?? row.Modelo,
    modeloLibre: row.modeloLibre ?? row.ModeloLibre,
    placas: (row.placas ?? row.Placas ?? '').trim() || undefined,
    color: row.color ?? row.Color,
    numeroCasa: row.numeroCasa ?? row.NumeroCasa,
  }
}

export type MarcaApiRow = MarcaDto & { MarcaId?: number; Marca?: string }
export type ModeloApiRow = ModeloDto & { ModeloId?: number; Modelo?: string; MarcaId?: number }

export function normalizeMarca(row: MarcaApiRow): MarcaDto {
  return { marcaId: row.marcaId ?? row.MarcaId ?? 0, marca: row.marca ?? row.Marca ?? '' }
}

export function normalizeModelo(row: ModeloApiRow): ModeloDto {
  return {
    modeloId: row.modeloId ?? row.ModeloId ?? 0,
    modelo: row.modelo ?? row.Modelo ?? '',
    marcaId: row.marcaId ?? row.MarcaId ?? 0,
  }
}

export function vehiculoTitulo(v: AutomovilListItem): string {
  const placas = v.placas?.trim()
  if (placas) return placas
  return 'Vehículo sin placas'
}

export function vehiculoSubtitulo(v: AutomovilListItem): string {
  const marcaModelo = [v.marca, v.modelo ?? v.modeloLibre].filter(Boolean).join(' ')
  if (marcaModelo && v.color) return `${marcaModelo} · ${v.color}`
  if (marcaModelo) return marcaModelo
  if (v.modeloLibre) return v.modeloLibre
  if (v.color) return `Color: ${v.color}`
  return 'Sin marca ni modelo — edita para completar'
}

export function vehiculoIncompleto(v: AutomovilListItem): boolean {
  return !v.placas?.trim()
}
