import '../test/stubToast'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MisMascotasPage } from './MisMascotasPage'

vi.mock('../features/mascotas/useMascotas', () => ({
  useMascotas: vi.fn(),
  useTiposMascota: vi.fn(() => []),
  useRazasMascota: vi.fn(() => []),
}))
vi.mock('../shared/lib/apiClient', () => ({
  apiPost: vi.fn().mockResolvedValue({}),
  apiPut: vi.fn().mockResolvedValue({}),
  apiDelete: vi.fn().mockResolvedValue({}),
}))

import { useMascotas } from '../features/mascotas/useMascotas'
const mockUseMascotas = useMascotas as ReturnType<typeof vi.fn>

const sample = [
  { mascotaId: 1, usuarioId: 10, nombreMascota: 'Firulais', tipoMascota: 'Perro', razaMascota: 'Labrador', vacunasAlDia: true },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockUseMascotas.mockReturnValue({ mascotas: sample, loading: false, error: null, reload: vi.fn() })
})

describe('MisMascotasPage', () => {
  it('renders page title', () => {
    render(<MisMascotasPage />)
    expect(screen.getByText(/mis mascotas/i)).toBeTruthy()
  })

  it('shows mascota card', () => {
    render(<MisMascotasPage />)
    expect(screen.getByText('Firulais')).toBeTruthy()
    expect(screen.getByText(/labrador/i)).toBeTruthy()
  })

  it('shows vacunas al día badge', () => {
    render(<MisMascotasPage />)
    expect(screen.getByText(/vacunas al día/i)).toBeTruthy()
  })

  it('opens create modal', () => {
    render(<MisMascotasPage />)
    fireEvent.click(screen.getByText(/nueva mascota/i))
    expect(screen.getByText(/nueva mascota/i, { selector: 'h2' })).toBeTruthy()
  })

  it('closes modal on cancel', () => {
    render(<MisMascotasPage />)
    fireEvent.click(screen.getByText(/\+ nueva mascota/i))
    fireEvent.click(screen.getByText(/cancelar/i))
    expect(screen.queryByRole('heading', { name: /nueva mascota/i })).toBeFalsy()
  })

  it('shows empty state when no mascotas', () => {
    mockUseMascotas.mockReturnValue({ mascotas: [], loading: false, error: null, reload: vi.fn() })
    render(<MisMascotasPage />)
    expect(screen.getByText(/no tienes mascotas/i)).toBeTruthy()
  })

  it('calls apiPost on valid create', async () => {
    const { apiPost } = await import('../shared/lib/apiClient')
    render(<MisMascotasPage />)
    fireEvent.click(screen.getByText(/\+ nueva mascota/i))
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Max' } })
    fireEvent.submit(screen.getByRole('button', { name: /guardar/i }).closest('form')!)
    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/USR/Mascotas', expect.objectContaining({ nombreMascota: 'Max' }))
    })
  })

  it('muestra error de guardado vía toast', async () => {
    const { useToast } = await import('../shared/toast/ToastContext')
    const toast = useToast()
    const { apiPost } = await import('../shared/lib/apiClient')
    vi.mocked(apiPost).mockResolvedValue({
      problem: { detail: 'Nombre duplicado' },
      status: 400,
    })
    render(<MisMascotasPage />)
    fireEvent.click(screen.getByText(/\+ nueva mascota/i))
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Max' } })
    fireEvent.submit(screen.getByRole('button', { name: /guardar/i }).closest('form')!)
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Nombre duplicado')
    })
  })
})
