import { z } from 'zod'

export const vehiculoResidenteSchema = z.object({
  placas: z.string().trim().min(1, 'Las placas son obligatorias'),
  marcaId: z.number().optional(),
  modeloId: z.number().optional(),
  modeloLibre: z.string().optional(),
  color: z.string().optional(),
})

export type VehiculoResidenteForm = z.infer<typeof vehiculoResidenteSchema>
