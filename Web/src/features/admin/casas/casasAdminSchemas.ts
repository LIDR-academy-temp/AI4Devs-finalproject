import { z } from 'zod'

export const casaCreateSchema = z.object({
  condominioId: z.number().int().positive('Condominio requerido'),
  numero: z.string().trim().min(1, 'Número requerido'),
  direccion: z.string().trim().min(1, 'Dirección requerida'),
  propietarioUsuarioId: z.string(),
})

export type CasaCreateForm = z.infer<typeof casaCreateSchema>

export const casaEditSchema = z.object({
  numero: z.string().trim().min(1, 'Número requerido'),
  direccion: z.string().trim().min(1, 'Dirección requerida'),
  propietarioUsuarioId: z.string(),
})

export type CasaEditForm = z.infer<typeof casaEditSchema>

export function propietarioIdFromForm(value: string): number | null {
  if (!value) return null
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : null
}
