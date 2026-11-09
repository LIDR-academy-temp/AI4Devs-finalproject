import { z } from 'zod'

export const vehiculoCreateAdminSchema = z.object({
  usuarioId: z.string().min(1, 'Seleccione al propietario'),
  placas: z.string().trim().min(1, 'Placas requeridas'),
  marcaId: z.string(),
  modeloId: z.string(),
  modeloLibre: z.string(),
  color: z.string(),
})

export const vehiculoEditAdminSchema = z.object({
  placas: z.string().trim().min(1, 'Placas requeridas'),
  marcaId: z.string(),
  modeloId: z.string(),
  modeloLibre: z.string(),
  color: z.string(),
})

export type VehiculoCreateAdminForm = z.infer<typeof vehiculoCreateAdminSchema>
export type VehiculoEditAdminForm = z.infer<typeof vehiculoEditAdminSchema>

export function usuarioIdFromForm(value: string): number {
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : 0
}

export function optionalIdFromForm(value: string): number | undefined {
  if (!value) return undefined
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : undefined
}
