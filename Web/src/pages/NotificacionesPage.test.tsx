import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NotificacionesPage } from './NotificacionesPage'

const mockFetch = vi.fn()
const mockMarcar = vi.fn()

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({ session: { token: 'jwt', perfil: 'Residente' } }),
}))

vi.mock('../features/notifications/notifications.api', () => ({
  fetchNotificaciones: (...args: unknown[]) => mockFetch(...args),
  marcarNotificacionLeida: (...args: unknown[]) => mockMarcar(...args),
}))

describe('TC-NAV-04 NotificacionesPage', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockMarcar.mockReset()
    mockFetch.mockResolvedValue({
      status: 200,
      data: {
        items: [
          {
            notificacionId: 9,
            titulo: 'Aviso',
            mensaje: 'Mantenimiento',
            tipo: 'AVISO',
            fechaCreacion: '2026-10-28',
            leida: false,
          },
        ],
        pagina: 1,
        tamano: 50,
        totalNoLeidas: 1,
      },
    })
    mockMarcar.mockResolvedValue({ status: 204 })
  })

  it('renderiza bandeja con ítem y PATCH leida', async () => {
    const user = userEvent.setup()
    render(<NotificacionesPage />)

    expect(await screen.findByRole('heading', { name: 'Notificaciones' })).toBeInTheDocument()
    expect(screen.getByText('Aviso')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Marcar leída' }))
    expect(mockMarcar).toHaveBeenCalledWith('jwt', 9)
  })
})
