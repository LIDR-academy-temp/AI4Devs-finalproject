import { z } from 'zod'

export const marcaAdminSchema = z.object({
  marca: z.string().trim().min(1, 'Nombre requerido'),
})

export const modeloAdminSchema = z.object({
  marcaId: z.string().min(1, 'Seleccione la marca'),
  modelo: z.string().trim().min(1, 'Nombre requerido'),
})

export type MarcaAdminForm = z.infer<typeof marcaAdminSchema>
export type ModeloAdminForm = z.infer<typeof modeloAdminSchema>
