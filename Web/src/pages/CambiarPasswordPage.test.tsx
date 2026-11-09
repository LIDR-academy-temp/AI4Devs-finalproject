import '../test/stubToast'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { CambiarPasswordPage } from './CambiarPasswordPage'

const cambiarPassword = vi.fn()

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({ cambiarPassword }),
}))

const navigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

describe('CambiarPasswordPage', () => {
  it('rechaza contraseña nueva corta (Zod)', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CambiarPasswordPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/contraseña actual/i), 'actual1234')
    await user.type(screen.getByLabelText(/contraseña nueva/i), 'corta')
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(cambiarPassword).not.toHaveBeenCalled()
    expect(screen.getByText(/mínimo 8/i)).toBeInTheDocument()
  })

  it('navega a login tras éxito', async () => {
    cambiarPassword.mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CambiarPasswordPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/contraseña actual/i), 'actual1234')
    await user.type(screen.getByLabelText(/contraseña nueva/i), 'nueva12345')
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(cambiarPassword).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/login', {
      replace: true,
      state: { passwordChanged: true },
    })
  })
})
