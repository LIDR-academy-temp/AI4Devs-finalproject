import { z } from 'zod'

export const paseFormSchema = z
  .object({
    nombreVisitante: z.string().trim().min(1, 'Nombre del visitante requerido'),
    tipoIdentificacionId: z.coerce.number().int().positive().optional(),
    numeroIdentificacion: z.string().trim().optional(),
    modoVigencia: z.enum(['horas', 'dia']),
    fechaInicio: z.string().min(1, 'Inicio requerido'),
    fechaFin: z.string().min(1, 'Fin requerido'),
  })
  .superRefine((data, ctx) => {
    const inicio = new Date(data.fechaInicio)
    const fin = new Date(data.fechaFin)
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
      ctx.addIssue({ code: 'custom', message: 'Fechas inválidas', path: ['fechaInicio'] })
      return
    }
    if (fin <= inicio) {
      ctx.addIssue({ code: 'custom', message: 'La vigencia fin debe ser posterior al inicio', path: ['fechaFin'] })
    }
  })

export type PaseFormValues = z.infer<typeof paseFormSchema>
export type PaseFormInput = z.input<typeof paseFormSchema>

export function buildCrearPaseBody(values: PaseFormValues) {
  const todoElDia = values.modoVigencia === 'dia'
  let fechaFin = values.fechaFin
  if (todoElDia) {
    const d = new Date(values.fechaFin)
    d.setHours(23, 59, 59, 999)
    fechaFin = d.toISOString()
  }
  return {
    nombreVisitante: values.nombreVisitante.trim(),
    tipoIdentificacionId:
      values.tipoIdentificacionId === undefined || Number.isNaN(values.tipoIdentificacionId)
        ? null
        : values.tipoIdentificacionId,
    numeroIdentificacion: values.numeroIdentificacion?.trim() || null,
    fechaInicio: new Date(values.fechaInicio).toISOString(),
    fechaFin: new Date(fechaFin).toISOString(),
    todoElDia,
  }
}

export function whatsAppShareHref(codigoQr: string, fechaExpira: string | null | undefined) {
  const hasta = fechaExpira ? new Date(fechaExpira).toLocaleString() : '—'
  const text = encodeURIComponent(`Pase visita ${codigoQr}\nVálido hasta ${hasta}`)
  return `https://wa.me/?text=${text}`
}
