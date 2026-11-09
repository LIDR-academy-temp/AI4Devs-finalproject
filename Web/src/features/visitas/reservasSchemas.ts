import { z } from 'zod'

export const reservaFormSchema = z
  .object({
    fechaInicio: z.string().min(1, 'Indica fecha y hora de inicio'),
    fechaFin: z.string().min(1, 'Indica fecha y hora de fin'),
  })
  .refine((data) => new Date(data.fechaFin) > new Date(data.fechaInicio), {
    message: 'La fecha de fin debe ser posterior al inicio',
    path: ['fechaFin'],
  })

export type ReservaFormValues = z.infer<typeof reservaFormSchema>
