import { z } from 'zod'

export const areaComunUpsertSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre requerido'),
  descripcion: z.string().optional(),
  capacidad: z.union([z.literal(''), z.coerce.number().int().positive()]).optional(),
  requiereReservacion: z.boolean(),
})

export type AreaComunUpsertForm = z.infer<typeof areaComunUpsertSchema>
export type AreaComunUpsertInput = z.input<typeof areaComunUpsertSchema>

export const reservaAdminCreateSchema = z
  .object({
    usuarioId: z.string().min(1, 'Selecciona un residente'),
    areaComunId: z.string().min(1, 'Selecciona un área'),
    fechaInicio: z.string().min(1, 'Indica inicio'),
    fechaFin: z.string().min(1, 'Indica fin'),
  })
  .refine((d) => new Date(d.fechaFin) > new Date(d.fechaInicio), {
    message: 'La fecha fin debe ser posterior al inicio',
    path: ['fechaFin'],
  })

export type ReservaAdminCreateForm = z.infer<typeof reservaAdminCreateSchema>
