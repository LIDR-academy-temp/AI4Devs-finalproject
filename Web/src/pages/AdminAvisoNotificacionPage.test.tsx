import '../test/stubToast'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AdminAvisoNotificacionPage } from './AdminAvisoNotificacionPage'

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({ session: { token: 'jwt' } }),
}))

describe('AdminAvisoNotificacionPage', () => {
  it('renderiza encabezado Aviso general', () => {
    render(
      <MemoryRouter>
        <AdminAvisoNotificacionPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Aviso general' })).toBeInTheDocument()
  })
})
