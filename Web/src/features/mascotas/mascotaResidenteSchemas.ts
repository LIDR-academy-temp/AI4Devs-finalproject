import { z } from 'zod'

export const mascotaResidenteSchema = z.object({
  nombreMascota: z.string().trim().min(1, 'El nombre es requerido'),
  tipoMascotaId: z.number().optional(),
  razaMascotaId: z.number().optional(),
  razaLibre: z.string().optional(),
  vacunasAlDia: z.boolean().optional(),
  fechaUltimaVacuna: z.string().optional(),
  fechaNacimiento: z.string().optional(),
})
