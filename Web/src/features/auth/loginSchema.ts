import { z } from 'zod'
import { correoField } from '../../shared/validation/correoSchema'

export const loginSchema = z.object({
  correo: correoField('Correo requerido'),
  password: z.string().min(1, 'Contraseña requerida'),
})

export type LoginForm = z.infer<typeof loginSchema>
