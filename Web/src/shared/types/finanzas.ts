export type CuotaEstado = {
  cuotaId: number
  casaId?: number | null
  direccion?: string | null
  numero?: string | null
  cuentaId?: number | null
  cuenta?: string | null
  monto: number
  montoPagado: number
  periodoInicio: string
  periodoFin: string
  fechaVencimiento: string
  fechaPago?: string | null
  metodoPago?: string | null
  referenciaPago?: string | null
  estado: string
  esVencida: boolean
}

export type EstadoCuenta = {
  cuotas: CuotaEstado[]
  totalPendiente: number
  totalVencido: number
}
