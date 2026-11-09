import { z } from 'zod'

export const visitaEntradaSchema = z.object({
  visitanteNombre: z.string().trim().min(1, 'Nombre requerido'),
  tipoIdentificacion: z.string().trim().min(1, 'Seleccione el tipo de identificación'),
  numeroIdentificacion: z.string().trim().min(1, 'Identificación requerida'),
  usuarioVisitadoId: z.string().min(1, 'Seleccione al residente visitado'),
  casaId: z.string(),
})

export type VisitaEntradaForm = z.infer<typeof visitaEntradaSchema>

export function usuarioVisitadoIdFromForm(value: string): number {
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : 0
}

export function casaIdFromForm(value: string): number | undefined {
  if (!value) return undefined
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : undefined
}
