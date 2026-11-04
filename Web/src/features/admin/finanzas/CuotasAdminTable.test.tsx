import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CuotasAdminTable } from './CuotasAdminTable'
import type { CuotaEstado } from '../../../shared/types/finanzas'

const base: CuotaEstado = {
  cuotaId: 4,
  casaId: 1,
  direccion: 'Calle',
  numero: '1',
  cuentaId: 1,
  cuenta: 'Mantenimiento',
  monto: 870,
  montoPagado: 0,
  periodoInicio: '2026-11-01T00:00:00',
  periodoFin: '2026-11-30T00:00:00',
  fechaVencimiento: '2026-11-01T00:00:00',
  fechaPago: null,
  metodoPago: null,
  referenciaPago: null,
  estado: 'Pendiente',
  esVencida: false,
}

describe('CuotasAdminTable', () => {
  it('muestra botón registrar pago en filas no pagadas', () => {
    const onPay = vi.fn()
    render(
      <CuotasAdminTable
        cuotas={[base, { ...base, cuotaId: 2, estado: 'Pagada' }]}
        onRegistrarPago={onPay}
      />,
    )
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('button', { name: /Registrar pago/i })).toHaveLength(1)
  })
})
