import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RegistrarPagoModal } from './RegistrarPagoModal'
import type { CuotaEstado } from '../../../shared/types/finanzas'

const cuota: CuotaEstado = {
  cuotaId: 50,
  monto: 1200,
  montoPagado: 0,
  periodoInicio: '2026-10-01',
  periodoFin: '2026-10-31',
  fechaVencimiento: '2026-10-15',
  estado: 'Vencida',
  esVencida: true,
}

describe('RegistrarPagoModal', () => {
  it('calls onSubmit with valid referencia', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <RegistrarPagoModal
        cuota={cuota}
        open
        saving={false}
        error={null}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    )
    await user.type(screen.getByLabelText(/Referencia/i), 'REF-OK')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(onSubmit).toHaveBeenCalled()
    expect(onSubmit.mock.calls[0][0].referenciaPago).toBe('REF-OK')
  })

  it('does not submit when referencia empty', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <RegistrarPagoModal
        cuota={cuota}
        open
        saving={false}
        error={null}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows server error message', () => {
    render(
      <RegistrarPagoModal
        cuota={cuota}
        open
        saving={false}
        error="Cuota ya registrada como pagada"
        onClose={() => {}}
        onSubmit={() => {}}
      />,
    )
    expect(screen.getByText('Cuota ya registrada como pagada')).toBeInTheDocument()
  })
})
