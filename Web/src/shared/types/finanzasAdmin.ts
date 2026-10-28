export type Moroso = {
  usuarioId: number
  nombre: string
  casa?: string | null
  cuotasVencidas: number
  totalAdeudado: number
}

export type GenerarCuotasResult = {
  creadas: number
  omitidas: number
}

export type RegistrarPagoInput = {
  montoPagado: number
  fechaPago: string
  metodoPago?: string
  referenciaPago: string
}
