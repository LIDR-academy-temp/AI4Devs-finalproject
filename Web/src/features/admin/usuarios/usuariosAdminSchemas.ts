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
  perfil: z.enum(PERFILES_USUARIO),
  casaId: z.string(),
})

export type UsuarioEditForm = z.infer<typeof usuarioEditSchema>

export function perfilFromPadron(perfil: string): (typeof PERFILES_USUARIO)[number] {
  return (PERFILES_USUARIO as readonly string[]).includes(perfil)
    ? (perfil as (typeof PERFILES_USUARIO)[number])
    : 'Residente'
}

export function casaIdFromUnidad(casas: { casaId: number; numero?: string | null; direccion?: string | null }[], unidad: string | null | undefined): string {
  if (!unidad?.trim()) return ''
  const needle = unidad.trim().toLowerCase()
  const found = casas.find((c) => {
    const numero = (c.numero?.trim() || String(c.casaId)).toLowerCase()
    const dir = c.direccion?.trim().toLowerCase() ?? ''
    const combined = `${dir} ${numero}`.trim()
    return needle === numero || needle === combined || needle.includes(numero) || combined.includes(needle)
  })
  return found ? String(found.casaId) : ''
}

export function casaIdFromForm(value: string): number | null {
  if (!value) return null
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : null
}
