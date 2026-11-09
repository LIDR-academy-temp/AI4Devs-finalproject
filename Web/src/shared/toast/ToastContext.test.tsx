import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.unmock('./ToastContext')

import { ToastProvider, useToast } from './ToastContext'

function Probe() {
  const toast = useToast()
  return (
    <button type="button" onClick={() => toast.success('Guardado')}>
      Disparar
    </button>
  )
}

describe('ToastProvider', () => {
  it('muestra toast y permite cerrar', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Disparar' }))
    expect(screen.getByRole('status')).toHaveTextContent('Guardado')

    await user.click(screen.getByRole('button', { name: 'Cerrar aviso' }))
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
  })
})
