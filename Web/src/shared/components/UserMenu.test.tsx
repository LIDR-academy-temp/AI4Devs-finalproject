import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { UserMenu } from './UserMenu'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../features/auth/AuthContext', () => ({
  useAuth: () => ({
    session: { nombre: 'Ana Test', perfil: 'Administrador', usuarioId: 1, correo: 'a@t.com' },
    logout: vi.fn(),
  }),
}))

describe('UserMenu', () => {
  it('cierra con Escape', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <UserMenu variant="header" />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: /menú de ana test/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('cierra al elegir un ítem y navega', async () => {
    navigateMock.mockClear()
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <UserMenu variant="header" />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: /menú de ana test/i }))
    await user.click(screen.getByRole('menuitem', { name: /mi perfil/i }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(navigateMock).toHaveBeenCalledWith('/perfil')
  })
})
