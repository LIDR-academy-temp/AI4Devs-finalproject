/** Alineado con CuartaEncuestasService.EsTextoLibre */
export function esPreguntaTextoLibre(tipoPregunta: string): boolean {
  return tipoPregunta.toLowerCase().includes('texto')
}

/** Varias opciones marcables (no confundir con catálogo "Opción múltiple" = una sola). */
export function esPreguntaSeleccionMultiple(tipoPregunta: string): boolean {
  const t = tipoPregunta.trim().toLowerCase()
  if (esPreguntaTextoLibre(tipoPregunta)) return false
  return (
    t.includes('múltiple opción') ||
    t.includes('multiple opcion') ||
    t === 'multiple' ||
    t === 'múltiple opción'
  )
}
