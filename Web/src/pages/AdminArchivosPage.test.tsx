import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminArchivosPage } from './AdminArchivosPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminArchivosPage />
    </MemoryRouter>,
  )
}

const mockArchivos = [
  {
    archivoId: 1,
    nombre: 'Reglamento 2024.pdf',
    ruta: 'archivos/a1.pdf',
    tipoArchivoId: 1,
    tipoArchivo: 'Reglamento',
    esPrivado: false,
    fechaCreacion: '2024-01-15T10:00:00',
  },
  {
    archivoId: 2,
    nombre: 'Contrato privado.docx',
    ruta: 'archivos/a2.docx',
    tipoArchivoId: 2,
    tipoArchivo: 'Contrato',
    esPrivado: true,
    fechaCreacion: '2024-03-20T09:00:00',
  },
]

const mockTipos = [
  { tipoArchivoId: 1, tipoArchivo: 'Reglamento' },
  { tipoArchivoId: 2, tipoArchivo: 'Contrato' },
]

const mockRefetch = vi.fn()
const mockUseArchivos = vi.fn()

vi.mock('../features/archivos/useArchivos', () => ({
  useArchivos: (...args: unknown[]) => mockUseArchivos(...args),
}))

vi.mock('../features/admin/archivos/useTiposArchivo', () => ({
  useTiposArchivo: vi.fn(() => ({ tipos: mockTipos })),
}))

vi.mock('../shared/lib/accessTokenStore', () => ({
  getAccessToken: vi.fn(() => 'test-token'),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)
URL.createObjectURL = vi.fn(() => 'blob:url')
URL.revokeObjectURL = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  mockUseArchivos.mockReturnValue({
    archivos: mockArchivos,
    loading: false,
    error: null,
    refetch: mockRefetch,
  })
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    blob: async () => new Blob(['data'], { type: 'application/pdf' }),
    json: async () => ({}),
  })
})

describe('AdminArchivosPage', () => {
  it('muestra placeholder mientras carga', async () => {
    mockUseArchivos.mockReturnValue({
      archivos: [],
      loading: true,
      error: null,
      refetch: mockRefetch,
    })
    const { container } = renderPage()
    expect(container.querySelector('.placeholder-glow')).toBeTruthy()
  })

  it('lista los archivos en la tabla', () => {
    renderPage()
    expect(screen.getByText('Reglamento 2024.pdf')).toBeInTheDocument()
    expect(screen.getByText('Contrato privado.docx')).toBeInTheDocument()
  })

  it('abre panel al pulsar Subir archivo', async () => {
    const user = userEvent.setup()
    const { container } = renderPage()
    await user.click(screen.getByRole('button', { name: /subir archivo/i }))
    expect(container.querySelector('.cq-split.panel-open')).toBeTruthy()
  })

  it('elimina tras ConfirmDialog', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByLabelText(/eliminar reglamento 2024/i))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ARC/Archivos/1'),
        expect.objectContaining({ method: 'DELETE' }),
      )
    })
  })

  it('muestra estado vacío cuando no hay archivos', async () => {
    mockUseArchivos.mockReturnValue({
      archivos: [],
      loading: false,
      error: null,
      refetch: mockRefetch,
    })
    renderPage()
    expect(screen.getByText(/no hay archivos/i)).toBeInTheDocument()
  })
})
