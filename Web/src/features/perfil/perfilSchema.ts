import { z } from 'zod'
import { correoField } from '../../shared/validation/correoSchema'

export const perfilSchema = z.object({
  correo: correoField(),
  telefono: z
    .string()
    .regex(/^\d{7,15}$/, 'Solo dígitos, 7 a 15 caracteres')
    .or(z.literal('')),
  nombre: z.string().max(200).optional(),
})

export type PerfilForm = z.infer<typeof perfilSchema>
