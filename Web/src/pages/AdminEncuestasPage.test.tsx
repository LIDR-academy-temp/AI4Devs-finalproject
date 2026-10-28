import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminEncuestasPage } from './AdminEncuestasPage'

vi.mock('../features/admin/encuestas/useEncuestasAdmin', () => ({
  useEncuestasAdmin: vi.fn(),
}))

vi.mock('../shared/lib/apiClient', () => ({
  apiPost: vi.fn().mockResolvedValue({ problem: null, status: 201, data: { encuestaId: 42 } }),
  apiPut: vi.fn().mockResolvedValue({ problem: null, status: 204 }),
  apiDelete: vi.fn().mockResolvedValue({ problem: null, status: 204 }),
}))

import { useEncuestasAdmin } from '../features/admin/encuestas/useEncuestasAdmin'
import { apiDelete, apiPost, apiPut } from '../shared/lib/apiClient'

const mockUseEncuestasAdmin = useEncuestasAdmin as ReturnType<typeof vi.fn>
const mockApiPost = apiPost as ReturnType<typeof vi.fn>
const mockApiPut = apiPut as ReturnType<typeof vi.fn>
const mockApiDelete = apiDelete as ReturnType<typeof vi.fn>

const defaultHookValue = {
  encuestas: [],
  loading: false,
  error: null,
  refetch: vi.fn(),
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminEncuestasPage />
    </MemoryRouter>,
  )
}

describe('AdminEncuestasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseEncuestasAdmin.mockReturnValue({ ...defaultHookValue, refetch: vi.fn() })
  })

  it('muestra estado de carga', () => {
    mockUseEncuestasAdmin.mockReturnValue({ ...defaultHookValue, loading: true })
    const { container } = renderPage()
    expect(container.querySelector('.placeholder-glow')).toBeTruthy()
  })

  it('muestra mensaje de error', () => {
    mockUseEncuestasAdmin.mockReturnValue({
      ...defaultHookValue,
      error: 'Error al cargar encuestas',
    })
    renderPage()
    expect(screen.getByText(/error al cargar encuestas/i)).toBeInTheDocument()
  })

  it('muestra mensaje cuando no hay encuestas', () => {
    renderPage()
    expect(screen.getByText(/no hay encuestas registradas/i)).toBeInTheDocument()
  })

  it('muestra lista de encuestas', () => {
    mockUseEncuestasAdmin.mockReturnValue({
      ...defaultHookValue,
      encuestas: [
        {
          encuestaId: 1,
          titulo: 'Encuesta Test',
          descripcion: 'Descripción de prueba',
          activa: true,
          fechaInicio: '2024-01-01T00:00:00',
          fechaFin: '2024-12-31',
          yaParticipo: false,
        },
      ],
    })
    renderPage()
    expect(screen.getByText('Encuesta Test')).toBeInTheDocument()
  })

  it('filtra solo activas', async () => {
    const user = userEvent.setup()
    mockUseEncuestasAdmin.mockReturnValue({
      ...defaultHookValue,
      encuestas: [
        {
          encuestaId: 1,
          titulo: 'Encuesta activa',
          activa: true,
          fechaInicio: '2024-01-01',
          yaParticipo: false,
        },
        {
          encuestaId: 2,
          titulo: 'Encuesta borrador',
          activa: false,
          fechaInicio: '2024-01-01',
          yaParticipo: false,
        },
      ],
    })
    renderPage()
    expect(screen.getByText('Encuesta borrador')).toBeInTheDocument()
    await user.click(screen.getByLabelText(/solo activas/i))
    expect(screen.queryByText('Encuesta borrador')).not.toBeInTheDocument()
    expect(screen.getByText('Encuesta activa')).toBeInTheDocument()
  })

  it('abre panel al hacer clic en Nueva encuesta', async () => {
    const user = userEvent.setup()
    const { container } = renderPage()
    await user.click(screen.getByRole('button', { name: /nueva encuesta/i }))
    expect(container.querySelector('.cq-split.panel-open')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Nueva encuesta' })).toBeInTheDocument()
  })

  it('publica tras confirmar en diálogo', async () => {
    const user = userEvent.setup()
    const refetch = vi.fn()
    mockUseEncuestasAdmin.mockReturnValue({
      ...defaultHookValue,
      refetch,
      encuestas: [
        {
          encuestaId: 9,
          titulo: 'Borrador',
          activa: false,
          fechaInicio: '2024-01-01',
          yaParticipo: false,
        },
      ],
    })
    renderPage()
    await user.click(screen.getByRole('button', { name: /publicar borrador/i }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Publicar' }))
    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith('/ENC/Encuestas/9/publicar', {})
    })
  })

  it('llama apiPost al guardar solo metadatos', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /nueva encuesta/i }))
    const panel = screen.getByRole('region')
    await user.type(within(panel).getByLabelText(/^título/i), 'Mi Encuesta')
    await user.click(within(panel).getByRole('button', { name: /solo guardar/i }))
    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        '/ENC/Encuestas',
        expect.objectContaining({
          titulo: 'Mi Encuesta',
          preguntas: [],
        }),
      )
    })
  })

  it('elimina borrador tras confirmar', async () => {
    const user = userEvent.setup()
    mockUseEncuestasAdmin.mockReturnValue({
      ...defaultHookValue,
      encuestas: [
        {
          encuestaId: 3,
          titulo: 'A borrar',
          activa: false,
          fechaInicio: '2024-01-01',
          yaParticipo: false,
        },
      ],
    })
    renderPage()
    await user.click(screen.getByRole('button', { name: /eliminar a borrar/i }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => {
      expect(mockApiDelete).toHaveBeenCalledWith('/ENC/Encuestas/3')
    })
  })
})
