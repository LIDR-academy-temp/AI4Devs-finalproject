/** Espejo UI de readme §3.2 — la API es autoridad. */
export const TRANSICIONES_PERMITIDAS: Record<string, string[]> = {
  Nuevo: ['En seguimiento', 'Cerrado'],
  'En seguimiento': ['Resuelto', 'Cerrado'],
  Resuelto: ['Cerrado', 'En seguimiento'],
  Cerrado: [],
}

export function estadosDestinoPermitidos(estadoActual: string): string[] {
  return TRANSICIONES_PERMITIDAS[estadoActual] ?? []
}
