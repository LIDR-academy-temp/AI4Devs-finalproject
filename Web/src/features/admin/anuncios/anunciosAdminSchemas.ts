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
  return new Date(value).toISOString()
}
