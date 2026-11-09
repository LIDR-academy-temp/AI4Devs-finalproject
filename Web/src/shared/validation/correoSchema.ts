import { z } from 'zod'

/** user@host — acepta seeds dev (`admin@local`); Zod `.email()` exige TLD con punto. */
export function correoField(requiredMessage?: string) {
  let field = z.string()
  if (requiredMessage) {
    field = field.min(1, requiredMessage)
  }
  return field.refine((v) => /^[^\s@]+@[^\s@]+$/.test(v.trim()), 'Correo inválido')
}
