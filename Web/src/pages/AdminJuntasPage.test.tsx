import '../test/stubToast'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminJuntasPage } from './AdminJuntasPage'

const mockJuntas = [
  {
    juntaId: 1,
    titulo: 'Junta Ordinaria Q1',
    descripcion: null,
    fechaProgramada: '2024-03-15T18:00:00',
    ubicacion: 'Salón social',
    activa: true,
    fechaCreacion: '2024-03-01T10:00:00',
  },
  {
    juntaId: 2,
    titulo: 'Asamblea Extraordinaria',
    descripcion: 'Votación de presupuesto',
    fechaProgramada: '2024-04-10T17:00:00',
    ubicacion: null,
    activa: false,
    fechaCreacion: '2024-03-20T09:00:00',
  },
]

const mockRefetch = vi.fn()
const mockUseJuntas = vi.fn()

vi.mock('../features/juntas/useJuntas', () => ({
  useJuntas: (...args: unknown[]) => mockUseJuntas(...args),
}))

const mockApiGet = vi.fn()
const mockApiPost = vi.fn()
const mockApiPut = vi.fn()
const mockApiDelete = vi.fn()

vi.mock('../shared/lib/apiClient', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiPut: (...args: unknown[]) => mockApiPut(...args),
  apiDelete: (...args: unknown[]) => mockApiDelete(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockUseJuntas.mockReturnValue({ juntas: mockJuntas, loading: false, error: null, refetch: mockRefetch })
  mockApiGet.mockResolvedValue({
    data: {
      juntaId: 1,
      titulo: 'Junta Ordinaria Q1',
      descripcion: null,
      fechaProgramada: '2024-03-15T18:00:00',
      ubicacion: 'Salón social',
      activa: true,
      fechaCreacion: '2024-03-01T10:00:00',
      contenido: 'Orden del día',
      archivos: [],
    },
  })
  mockApiPost.mockResolvedValue({})
  mockApiPut.mockResolvedValue({})
  mockApiDelete.mockResolvedValue({})
})

describe('AdminJuntasPage', () => {
  it('muestra placeholder mientras carga', async () => {
    mockUseJuntas.mockReturnValue({
      juntas: [],
      loading: true,
      error: null,
      refetch: mockRefetch,
    })
    const { container } = render(<AdminJuntasPage />)
    expect(container.querySelector('.placeholder-glow')).toBeTruthy()
  })

  it('lista las juntas en la tabla', () => {
    render(<AdminJuntasPage />)
    expect(screen.getAllByText('Junta Ordinaria Q1').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Asamblea Extraordinaria').length).toBeGreaterThanOrEqual(1)
  })

  it('abre panel al pulsar Nueva junta', async () => {
    const user = userEvent.setup()
    const { container } = render(<AdminJuntasPage />)
    await user.click(screen.getByRole('button', { name: /nueva junta/i }))
    expect(container.querySelector('.cq-split.panel-open')).toBeTruthy()
  })

  it('llama apiPost al crear junta válida', async () => {
    const user = userEvent.setup()
    render(<AdminJuntasPage />)
    await user.click(screen.getByRole('button', { name: /nueva junta/i }))
    const panel = screen.getByRole('region')
    await user.type(within(panel).getByLabelText(/^título/i), 'Nueva junta test')
    await user.type(within(panel).getByLabelText(/fecha y hora/i), '2025-06-15T18:00')
    await user.click(within(panel).getByRole('button', { name: /crear junta/i }))
    await waitFor(() =>
      expect(mockApiPost).toHaveBeenCalledWith(
        '/JNT/Juntas',
        expect.objectContaining({ titulo: 'Nueva junta test' }),
      ),
    )
  })

  it('abre edición y llama apiPut al guardar', async () => {
    const user = userEvent.setup()
    render(<AdminJuntasPage />)
    await user.click(screen.getAllByLabelText(/editar junta ordinaria q1/i)[0])
    const panel = await screen.findByRole('region')
    await user.clear(within(panel).getByLabelText(/^título/i))
    await user.type(within(panel).getByLabelText(/^título/i), 'Junta actualizada')
    await user.click(within(panel).getByRole('button', { name: /guardar/i }))
    await waitFor(() =>
      expect(mockApiPut).toHaveBeenCalledWith(
        '/JNT/Juntas/1',
        expect.objectContaining({ titulo: 'Junta actualizada' }),
      ),
    )
  })

  it('elimina tras confirmar', async () => {
    const user = userEvent.setup()
    render(<AdminJuntasPage />)
    await user.click(screen.getByLabelText(/eliminar junta ordinaria q1/i))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(mockApiDelete).toHaveBeenCalledWith('/JNT/Juntas/1'))
  })

  it('muestra toast al activar o cerrar junta', async () => {
    const { useToast } = await import('../shared/toast/ToastContext')
    const toast = useToast()
    const user = userEvent.setup()
    render(<AdminJuntasPage />)
    await user.click(screen.getAllByRole('button', { name: 'Cerrada' })[0])
    await waitFor(() => expect(mockApiPut).toHaveBeenCalledWith('/JNT/Juntas/2', { activa: true }))
    expect(toast.success).toHaveBeenCalledWith('Junta activada')
  })

  it('muestra error de carga vía toast', async () => {
    const { useToast } = await import('../shared/toast/ToastContext')
    const toast = useToast()
    mockUseJuntas.mockReturnValue({
      juntas: [],
      loading: false,
      error: 'Error al cargar juntas',
      refetch: mockRefetch,
    })
    render(<AdminJuntasPage />)
    expect(toast.error).toHaveBeenCalledWith('Error al cargar juntas')
  })

  it('muestra estado vacío cuando no hay juntas', async () => {
    mockUseJuntas.mockReturnValue({
      juntas: [],
      loading: false,
      error: null,
      refetch: mockRefetch,
    })
    render(<AdminJuntasPage />)
    expect(screen.getByText(/sin juntas registradas/i)).toBeInTheDocument()
  })
})
