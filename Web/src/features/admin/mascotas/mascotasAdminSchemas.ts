import { z } from 'zod'

export const mascotaCreateAdminSchema = z.object({
  usuarioId: z.string().min(1, 'Seleccione al propietario'),
  nombreMascota: z.string().trim().min(1, 'El nombre es requerido'),
  tipoMascotaId: z.string(),
  razaMascotaId: z.string(),
  razaLibre: z.string(),
  vacunasAlDia: z.enum(['', 'true', 'false']),
  fechaUltimaVacuna: z.string(),
  fechaNacimiento: z.string(),
})

export const mascotaEditAdminSchema = z.object({
  nombreMascota: z.string().trim().min(1, 'El nombre es requerido'),
  tipoMascotaId: z.string(),
  razaMascotaId: z.string(),
  razaLibre: z.string(),
  vacunasAlDia: z.enum(['', 'true', 'false']),
  fechaUltimaVacuna: z.string(),
  fechaNacimiento: z.string(),
})

export const tipoMascotaAdminSchema = z.object({
  tipoMascota: z.string().trim().min(1, 'Nombre requerido'),
})

export const razaMascotaAdminSchema = z.object({
  tipoMascotaId: z.string().min(1, 'Seleccione el tipo'),
  razaMascota: z.string().trim().min(1, 'Nombre requerido'),
})

export type MascotaCreateAdminForm = z.infer<typeof mascotaCreateAdminSchema>
export type MascotaEditAdminForm = z.infer<typeof mascotaEditAdminSchema>
export type TipoMascotaAdminForm = z.infer<typeof tipoMascotaAdminSchema>
export type RazaMascotaAdminForm = z.infer<typeof razaMascotaAdminSchema>

export function usuarioIdFromForm(value: string): number {
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : 0
}

export function optionalIdFromForm(value: string): number | undefined {
  if (!value) return undefined
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : undefined
}

export function vacunasFromForm(value: string): boolean | undefined {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

export function mascotaPayloadFromAdminForm(
  data: MascotaCreateAdminForm | MascotaEditAdminForm,
  includeUsuario?: number,
) {
  const base = {
    nombreMascota: data.nombreMascota.trim(),
    tipoMascotaId: optionalIdFromForm(data.tipoMascotaId),
    razaMascotaId: optionalIdFromForm(data.razaMascotaId),
    razaLibre: data.razaLibre.trim() || undefined,
    vacunasAlDia: vacunasFromForm(data.vacunasAlDia),
    fechaUltimaVacuna: data.fechaUltimaVacuna || undefined,
    fechaNacimiento: data.fechaNacimiento || undefined,
  }
  if (includeUsuario !== undefined) {
    return { usuarioId: includeUsuario, ...base }
  }
  return base
}
