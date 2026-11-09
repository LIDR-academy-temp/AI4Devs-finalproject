import { z } from 'zod'

export const categoriaTicketUpsertSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre requerido').max(100, 'Máximo 100 caracteres'),
})

export type CategoriaTicketUpsertForm = z.infer<typeof categoriaTicketUpsertSchema>

export const prioridadTicketUpsertSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre requerido').max(100, 'Máximo 100 caracteres'),
  orden: z
    .union([z.literal(''), z.coerce.number().int().min(1, 'Orden 1–99').max(99, 'Orden 1–99')])
    .optional(),
})

export type PrioridadTicketUpsertForm = z.infer<typeof prioridadTicketUpsertSchema>
export type PrioridadTicketUpsertInput = z.input<typeof prioridadTicketUpsertSchema>

export function ordenPrioridadToApi(value: PrioridadTicketUpsertForm['orden']): number | undefined {
  if (value === '' || value === undefined || Number.isNaN(value)) {
    return undefined
  }
  return value
}
