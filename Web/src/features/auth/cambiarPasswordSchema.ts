import { z } from 'zod'

export const cambiarPasswordSchema = z
  .object({
    passwordActual: z.string().min(1, 'Contraseña actual requerida'),
    passwordNueva: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .max(128, 'Máximo 128 caracteres'),
  })
  .refine((data) => data.passwordNueva !== data.passwordActual, {
    message: 'La contraseña nueva debe ser distinta de la actual',
    path: ['passwordNueva'],
  })

export type CambiarPasswordForm = z.infer<typeof cambiarPasswordSchema>
