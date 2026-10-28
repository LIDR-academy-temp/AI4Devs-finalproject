import { z } from 'zod'

export const archivoUploadSchema = z.object({
  nombre: z.string().trim(),
  tipoArchivo: z.string().min(1, 'Selecciona el tipo de archivo'),
  esPrivado: z.boolean(),
})

export type ArchivoUploadForm = z.infer<typeof archivoUploadSchema>

export const archivoEditSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es requerido'),
  tipoArchivo: z.string().min(1, 'Selecciona el tipo de archivo'),
  esPrivado: z.boolean(),
})

export type ArchivoEditForm = z.infer<typeof archivoEditSchema>
