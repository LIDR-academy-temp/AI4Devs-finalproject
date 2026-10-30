export type MorasBatchResult = {
  actualizadas: number
  omitidas: number
}

export type Moroso = {
  usuarioId: number
  nombre: string
  casa?: string | null
  casaId?: number | null
  cuotasVencidas: number
  morasAplicadas?: number
  totalMora?: number
  totalAdeudado: number
}

export type GenerarCuotasResult = {
  creadas: number
  omitidas: number
}

export type CuentaFnzCatalogo = {
  cuentaId: number
  nombre: string
}

export type CuentaFnzAdmin = {
  cuentaId: number
  nombre: string
  tipo: string
  saldo: number
  responsableUsuarioId?: number | null
}

export type TipoCuentaFnz = {
  tipoCuentaId: number
  nombre: string
  descripcion?: string | null
}

export type TipoMovimientoFnz = {
  tipoMovimientoId: number
  tipoMovimiento: string
  bCargo: boolean
  bAbono: boolean
}

export type PeriodoCuotasGenerado = {
  periodoInicio: string
  mes: number
  anio: number
  cuotasGeneradas: number
  casas: number
  montoUnitario: number
  fechaVencimiento: string
  generadoEn: string
  cuentaNombre?: string | null
}

export type MovimientoFnz = {
  transaccionId: number
  cuentaId: number
  cuentaNombre: string
  tipoMovimiento: string
  cargo?: number | null
  abono?: number | null
  motivo?: string | null
  fechaCreacion: string
}

export type RegistrarPagoInput = {
  montoPagado: number
  fechaPago: string
  metodoPago?: string
  referenciaPago: string
}
