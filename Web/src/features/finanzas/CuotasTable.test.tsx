import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CuotasTable } from './CuotasTable'
import type { CuotaEstado } from '../../shared/types/finanzas'

const base: CuotaEstado = {
  cuotaId: 1,
  casaId: 1,
  direccion: 'Calle',
  numero: '1',
  cuentaId: 1,
  cuenta: 'Mantenimiento',
  monto: 500,
  montoPagado: 0,
  periodoInicio: '2026-10-01T00:00:00',
  periodoFin: '2026-10-31T00:00:00',
  fechaVencimiento: '2026-10-20T00:00:00',
  fechaPago: null,
  metodoPago: null,
  referenciaPago: null,
  estado: 'Pendiente',
  esVencida: false,
}

describe('CuotasTable', () => {
  it('muestra badge Vencida cuando esVencida', () => {
    const cuotas: CuotaEstado[] = [
      base,
      { ...base, cuotaId: 2, estado: 'Vencida', esVencida: true },
    ]
    render(<CuotasTable cuotas={cuotas} />)
    expect(screen.getByText('Vencida')).toHaveClass('cq-portal-badge')
  })

  it('muestra estado del API sin recalcular', () => {
    render(<CuotasTable cuotas={[{ ...base, estado: 'Pagada' }]} />)
    expect(screen.getByText('Pagada')).toBeInTheDocument()
  })
})
