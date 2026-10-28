import { z } from 'zod'

export const PERFILES_USUARIO = ['Residente', 'Guardia', 'Trabajador', 'Administrador'] as const

export const usuarioCreateSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre requerido'),
  correo: z.string().trim().email('Correo inválido'),
  telefono: z.string().trim(),
  perfil: z.enum(PERFILES_USUARIO),
  casaId: z.string(),
})

export type UsuarioCreateForm = z.infer<typeof usuarioCreateSchema>

export const usuarioEditSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre requerido'),
  correo: z.string().trim().email('Correo inválido'),
  telefono: z.string().trim(),
})

export type UsuarioEditForm = z.infer<typeof usuarioEditSchema>

export function casaIdFromForm(value: string): number | null {
  if (!value) return null
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : null
}
