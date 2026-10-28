import { z } from 'zod'

export const ticketFormSchema = z.object({
  categoria: z.string().min(1, 'Selecciona una categoría'),
  titulo: z.string().min(1, 'Título requerido').max(200, 'Máximo 200 caracteres'),
  descripcion: z.string().min(1, 'Descripción requerida').max(4000, 'Máximo 4000 caracteres'),
  prioridad: z.string().optional(),
})

export type TicketFormValues = z.infer<typeof ticketFormSchema>
