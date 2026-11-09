import { z } from 'zod'

export const cuentaFnzUpsertSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre requerido').max(150),
  tipo: z.string().trim().min(1, 'Tipo requerido').max(50),
  saldo: z.number().min(0, 'Saldo no puede ser negativo'),
  responsableUsuarioId: z.string().optional(),
})

export type CuentaFnzUpsertForm = z.infer<typeof cuentaFnzUpsertSchema>

export function cuentaUpsertBody(form: CuentaFnzUpsertForm) {
  const resp = form.responsableUsuarioId?.trim()
  return {
    nombre: form.nombre,
    tipo: form.tipo,
    saldo: form.saldo,
    responsableUsuarioId: resp ? Number(resp) : undefined,
  }
}
