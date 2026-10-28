import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'

const loginMock = vi.fn()

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({
    login: loginMock,
  }),
}))

describe('LoginPage', () => {
  it('muestra hero y formulario de inicio de sesión', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: /tu comunidad/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.getByLabelText('Correo')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
  })

  it('envía credenciales al submit', async () => {
    loginMock.mockResolvedValue({ ok: true, requiereCambioPassword: false })
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )
    await user.type(screen.getByLabelText('Correo'), 'admin@local')
    await user.type(screen.getByLabelText('Contraseña'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(loginMock).toHaveBeenCalledWith('admin@local', 'secret')
  })
})
