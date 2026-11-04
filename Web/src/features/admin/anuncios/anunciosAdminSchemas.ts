import { z } from 'zod'

export const anuncioFormSchema = z.object({
  titulo: z.string().trim().min(1, 'Título requerido'),
  contenido: z.string().trim().min(1, 'Contenido requerido'),
  tipoAnuncio: z.string().min(1, 'Tipo requerido'),
  vigenteHasta: z.string(),
})

export type AnuncioForm = z.infer<typeof anuncioFormSchema>

export function vigenteHastaToIso(value: string): string | null {
  if (!value.trim()) return null
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (dateOnly) {
    const y = Number(dateOnly[1])
    const mo = Number(dateOnly[2]) - 1
    const d = Number(dateOnly[3])
    // Fin del dia local: "vigente hasta hoy" incluye todo el dia en el calendario del admin.
    return new Date(y, mo, d, 23, 59, 59, 999).toISOString()
  }
  return new Date(value).toISOString()
}
