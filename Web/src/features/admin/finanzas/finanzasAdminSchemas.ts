import { z } from 'zod'

export const registrarPagoSchema = z.object({
  montoPagado: z.number().positive(),
  fechaPago: z.string().min(1, 'Fecha requerida'),
  metodoPago: z.string().max(100).optional(),
  referenciaPago: z.string().min(1, 'Referencia requerida').max(200),
})

export type RegistrarPagoForm = z.infer<typeof registrarPagoSchema>

export const generarCuotasSchema = z.object({
  mes: z.number().int().min(1).max(12),
  anio: z.number().int().min(2024).max(2100),
  monto: z.number().positive('Monto debe ser mayor a cero'),
  fechaVencimiento: z.string().min(1, 'Vencimiento requerido'),
  cuentaId: z.number().int().positive().optional(),
})

export type GenerarCuotasForm = z.infer<typeof generarCuotasSchema>
