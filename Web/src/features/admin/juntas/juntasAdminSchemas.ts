import { z } from 'zod'

export const juntaCreateSchema = z.object({
  titulo: z.string().trim().min(1, 'Título requerido'),
  descripcion: z.string().trim(),
  fechaProgramada: z.string().min(1, 'Fecha y hora requeridas'),
  ubicacion: z.string().trim(),
  contenido: z.string().trim(),
})

export type JuntaCreateForm = z.infer<typeof juntaCreateSchema>

export const juntaEditSchema = juntaCreateSchema.extend({
  activa: z.boolean(),
})

export type JuntaEditForm = z.infer<typeof juntaEditSchema>
