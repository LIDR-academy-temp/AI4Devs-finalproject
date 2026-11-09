import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NotificationBell } from './NotificationBell'

const mockFetch = vi.fn()
const mockMarcar = vi.fn()

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ session: { token: 'jwt' } }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

vi.mock('./notifications.api', () => ({
  fetchNotificaciones: (...args: unknown[]) => mockFetch(...args),
  marcarNotificacionLeida: (...args: unknown[]) => mockMarcar(...args),
}))

describe('NotificationBell', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockMarcar.mockReset()
    mockFetch.mockResolvedValue({
      status: 200,
      data: {
        items: [
          {
            notificacionId: 1,
            titulo: 'Pago',
            mensaje: 'Registrado',
            tipo: 'PAGO',
            fechaCreacion: '2026-10-16',
            leida: false,
          },
        ],
        pagina: 1,
        tamano: 20,
        totalNoLeidas: 2,
      },
    })
    mockMarcar.mockResolvedValue({ status: 204 })
  })

  it('CA-3: badge muestra totalNoLeidas', async () => {
    render(<NotificationBell />)
    await vi.waitFor(() => {
      expect(screen.getByTestId('notif-badge')).toHaveTextContent('2')
    })
  })

  it('CA-4: marcar leída reduce badge', async () => {
    const user = userEvent.setup()
    render(<NotificationBell />)
    await vi.waitFor(() => expect(screen.getByTestId('notif-badge')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Notificaciones'))
    await user.click(screen.getByRole('button', { name: 'Marcar leída' }))

    await vi.waitFor(() => {
      expect(screen.getByTestId('notif-badge')).toHaveTextContent('1')
    })
    expect(mockMarcar).toHaveBeenCalledWith('jwt', 1)
  })
})
