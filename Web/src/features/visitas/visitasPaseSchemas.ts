import { z } from 'zod'

export const paseFormSchema = z
  .object({
    nombreVisitante: z.string().trim().min(1, 'Nombre del visitante requerido'),
    tipoIdentificacionId: z.coerce.number().int().positive().optional(),
    numeroIdentificacion: z.string().trim().optional(),
    tipoVisita: z.enum(['unaOcasion', 'rangoDias']),
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
    if (data.tipoVisita === 'rangoDias') {
      if (fin < new Date(inicio.toDateString())) {
        ctx.addIssue({
          code: 'custom',
          message: 'La fecha fin no puede ser anterior al inicio',
          path: ['fechaFin'],
        })
      }
      return
    }
    if (fin <= inicio) {
      ctx.addIssue({ code: 'custom', message: 'La vigencia fin debe ser posterior al inicio', path: ['fechaFin'] })
    }
  })

export type PaseFormValues = z.infer<typeof paseFormSchema>
export type PaseFormInput = z.input<typeof paseFormSchema>

export const adminPaseQrSchema = paseFormSchema.extend({
  usuarioVisitadoId: z.string().trim().min(1, 'Seleccione un residente'),
  casaId: z.string().optional(),
})

export type AdminPaseQrFormValues = z.infer<typeof adminPaseQrSchema>
export type AdminPaseQrFormInput = z.input<typeof adminPaseQrSchema>

function startOfLocalDayIso(dateStr: string) {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function endOfLocalDayIso(dateStr: string) {
  const d = new Date(dateStr)
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

export function buildCrearPaseBody(values: PaseFormValues) {
  const unaOcasion = values.tipoVisita === 'unaOcasion'
  if (!unaOcasion) {
    return {
      nombreVisitante: values.nombreVisitante.trim(),
      tipoIdentificacionId:
        values.tipoIdentificacionId === undefined || Number.isNaN(values.tipoIdentificacionId)
          ? null
          : values.tipoIdentificacionId,
      numeroIdentificacion: values.numeroIdentificacion?.trim() || null,
      fechaInicio: startOfLocalDayIso(values.fechaInicio),
      fechaFin: endOfLocalDayIso(values.fechaFin),
      todoElDia: true,
      unaOcasion: false,
    }
  }

  const todoElDia = values.modoVigencia === 'dia'
  let fechaFin = values.fechaFin
  if (todoElDia) {
    fechaFin = endOfLocalDayIso(values.fechaFin)
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
    unaOcasion: true,
  }
}

export function buildCrearPaseAdminBody(values: AdminPaseQrFormValues) {
  const casaRaw = values.casaId?.trim()
  const casaId = casaRaw ? Number(casaRaw) : undefined
  return {
    ...buildCrearPaseBody(values),
    usuarioVisitadoId: Number(values.usuarioVisitadoId),
    ...(casaId !== undefined && Number.isFinite(casaId) && casaId > 0 ? { casaId } : {}),
  }
}

export function vigenciaPaseTexto(pase: {
  fechaEmision: string
  fechaExpira: string | null | undefined
  unaOcasion?: boolean
}) {
  if (pase.unaOcasion === false) {
    const desde = new Date(pase.fechaEmision).toLocaleDateString()
    const hasta = pase.fechaExpira ? new Date(pase.fechaExpira).toLocaleDateString() : '—'
    return `Válido del ${desde} al ${hasta} (varias entradas)`
  }
  const hasta = pase.fechaExpira ? new Date(pase.fechaExpira).toLocaleString() : '—'
  return `Una ocasión — válido hasta ${hasta}`
}

export function whatsAppShareHref(
  codigoQr: string,
  pase: { fechaEmision: string; fechaExpira: string | null | undefined; unaOcasion?: boolean },
) {
  const text = encodeURIComponent(`Pase visita ${codigoQr}\n${vigenciaPaseTexto(pase)}`)
  return `https://wa.me/?text=${text}`
}

export function mailShareHref(
  codigoQr: string,
  pase: { fechaEmision: string; fechaExpira: string | null | undefined; unaOcasion?: boolean },
) {
  const subject = encodeURIComponent('Pase de visita — Cuarta Quinientos')
  const body = encodeURIComponent(
    `Hola,\n\nTe comparto tu pase de visita.\n\nCódigo: ${codigoQr}\n${vigenciaPaseTexto(pase)}\n\nPresenta el QR o este código en caseta.`,
  )
  return `mailto:?subject=${subject}&body=${body}`
}

export function pasePuedeEditarse(p: { estadoLista: string; bUsado?: boolean; unaOcasion?: boolean }) {
  if (p.estadoLista === 'expirado' || p.estadoLista === 'usado') return false
  if (p.unaOcasion !== false && p.bUsado) return false
  return p.estadoLista === 'vigente' || p.estadoLista === 'pendiente'
}

function toLocalFormDate(iso: string, dateOnly: boolean) {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return dateOnly ? d.toISOString().slice(0, 10) : d.toISOString().slice(0, 16)
}

export function paseToAdminFormValues(
  p: {
    usuarioVisitadoId?: number
    casaId?: number | null
    nombreVisitante: string
    unaOcasion?: boolean
    fechaEmision: string
    fechaExpira: string | null
    tipoIdentificacion?: string | null
    numeroIdentificacion?: string | null
  },
  tipos: { tipoIdentificacionId: number; tipoIdentificacion: string }[],
): AdminPaseQrFormInput {
  const rango = p.unaOcasion === false
  const tipoId = tipos.find((t) => t.tipoIdentificacion === p.tipoIdentificacion)?.tipoIdentificacionId
  return {
    usuarioVisitadoId: p.usuarioVisitadoId ? String(p.usuarioVisitadoId) : '',
    casaId: p.casaId ? String(p.casaId) : '',
    nombreVisitante: p.nombreVisitante,
    tipoVisita: rango ? 'rangoDias' : 'unaOcasion',
    modoVigencia: 'horas',
    fechaInicio: toLocalFormDate(p.fechaEmision, rango),
    fechaFin: toLocalFormDate(p.fechaExpira ?? p.fechaEmision, rango),
    tipoIdentificacionId: tipoId,
    numeroIdentificacion: p.numeroIdentificacion ?? '',
  }
}
