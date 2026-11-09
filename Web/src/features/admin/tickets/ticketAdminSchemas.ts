import { z } from 'zod'

export const ticketAdminCreateSchema = z.object({
  usuarioSolicitanteId: z.string().min(1, 'Seleccione al residente solicitante'),
  titulo: z.string().trim().min(1, 'Título requerido').max(200),
  descripcion: z.string().trim().min(1, 'Descripción requerida').max(4000),
  categoria: z.string().min(1, 'Seleccione categoría'),
  prioridad: z.string().optional(),
})

export const ticketAdminEditSchema = z.object({
  titulo: z.string().trim().min(1, 'Título requerido').max(200),
  descripcion: z.string().trim().min(1, 'Descripción requerida').max(4000),
  categoria: z.string().min(1, 'Seleccione categoría'),
  prioridad: z.string().optional(),
})

export type TicketAdminCreateForm = z.infer<typeof ticketAdminCreateSchema>
export type TicketAdminEditForm = z.infer<typeof ticketAdminEditSchema>

export function prioridadToApi(value: string | undefined): string | undefined {
  if (!value) return undefined
  return value === '' ? undefined : value
}

export function residenteIdFromForm(value: string): number {
  return Number(value)
}
