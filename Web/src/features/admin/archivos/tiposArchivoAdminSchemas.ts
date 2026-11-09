import { z } from 'zod'

export const tipoArchivoUpsertSchema = z.object({
  tipoArchivo: z
    .string()
    .trim()
    .min(1, 'El nombre es requerido')
    .max(120, 'Máximo 120 caracteres'),
})

export type TipoArchivoUpsertForm = z.infer<typeof tipoArchivoUpsertSchema>
