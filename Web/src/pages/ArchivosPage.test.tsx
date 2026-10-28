import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ArchivosPage } from './ArchivosPage'

vi.mock('../features/archivos/useArchivos', () => ({
  useArchivos: vi.fn(),
}))
vi.mock('../features/admin/archivos/useTiposArchivo', () => ({
  useTiposArchivo: vi.fn(),
}))
vi.mock('../shared/lib/downloadAuthenticated', () => ({
  downloadAuthenticated: vi.fn(),
}))

import { useArchivos } from '../features/archivos/useArchivos'
import { useTiposArchivo } from '../features/admin/archivos/useTiposArchivo'
import { downloadAuthenticated } from '../shared/lib/downloadAuthenticated'
import userEvent from '@testing-library/user-event'

const mockUseArchivos = useArchivos as ReturnType<typeof vi.fn>
const mockUseTipos = useTiposArchivo as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  mockUseTipos.mockReturnValue({ tipos: [{ tipoArchivoId: 1, tipoArchivo: 'Reglamento' }] })
  mockUseArchivos.mockReturnValue({
    archivos: [],
    loading: false,
    error: null,
  })
})

describe('ArchivosPage', () => {
  it('muestra título y estado vacío', () => {
    render(<ArchivosPage />)
    expect(screen.getByText('Documentos')).toBeInTheDocument()
    expect(screen.getByText('No hay documentos disponibles.')).toBeInTheDocument()
  })

  it('muestra archivo con botón descargar', () => {
    mockUseArchivos.mockReturnValue({
      archivos: [
        {
          archivoId: 1,
          nombre: 'Reglamento.pdf',
          tipoArchivo: 'Reglamento',
          fechaCreacion: '2026-01-15T10:00:00Z',
        },
      ],
      loading: false,
      error: null,
    })
    render(<ArchivosPage />)
    expect(screen.getByText('Reglamento.pdf')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Descargar' })).toBeInTheDocument()
  })

  it('TC-ARC-1: descarga usa downloadAuthenticated', async () => {
    const user = userEvent.setup()
    const mockDownload = downloadAuthenticated as ReturnType<typeof vi.fn>
    mockDownload.mockResolvedValue({ ok: true, blob: new Blob(['pdf']) })
    mockUseArchivos.mockReturnValue({
      archivos: [
        {
          archivoId: 2,
          nombre: 'Acta.pdf',
          tipoArchivo: 'Acta',
          fechaCreacion: '2026-01-15T10:00:00Z',
        },
      ],
      loading: false,
      error: null,
    })
    render(<ArchivosPage />)
    await user.click(screen.getByRole('button', { name: 'Descargar' }))
    expect(mockDownload).toHaveBeenCalledWith('/ARC/Archivos/2/descargar')
  })

  it('muestra error de carga vía toast', async () => {
    mockUseArchivos.mockReturnValue({
      archivos: [],
      loading: false,
      error: 'No se pudieron cargar',
      refetch: vi.fn(),
    })
    render(<ArchivosPage />)
    const { useToast } = await import('../shared/toast/ToastContext')
    const toast = useToast()
    expect(toast.error).toHaveBeenCalledWith('No se pudieron cargar')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
