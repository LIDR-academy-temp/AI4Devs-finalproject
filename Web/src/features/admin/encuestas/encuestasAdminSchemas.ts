import { z } from 'zod'

export function parseOpcionesFromText(texto: string) {
  return texto
    .split('\n')
    .map((t, i) => ({ texto: t.trim(), orden: i + 1 }))
    .filter((o) => o.texto)
}

export const encuestaMetadataSchema = z.object({
  titulo: z.string().trim().min(1, 'Título requerido'),
  descripcion: z.string().trim(),
  fechaInicio: z.string().min(1, 'Fecha inicio requerida'),
  fechaFin: z.string(),
})

export type EncuestaMetadataForm = z.infer<typeof encuestaMetadataSchema>

export const preguntaCreateSchema = z.object({
  texto: z.string().trim().min(1, 'Texto requerido'),
  tipoPreguntaId: z.number().int().min(1, 'Tipo requerido'),
  requerida: z.boolean(),
  opcionesTexto: z.string(),
})

export type PreguntaCreateForm = z.infer<typeof preguntaCreateSchema>

export const preguntaUpdateSchema = preguntaCreateSchema
export type PreguntaUpdateForm = PreguntaCreateForm

export function toDateInputValue(iso: string | undefined): string {
  if (!iso) return ''
  const d = iso.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : new Date(iso).toISOString().slice(0, 10)
}
