import '../test/stubToast'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdminAlmacenPage } from './AdminAlmacenPage'
import * as apiClient from '../shared/lib/apiClient'

vi.mock('../features/almacen/useAlmacen')
vi.mock('../features/admin/usuarios/usePadronUsuarios')
vi.mock('../shared/lib/apiClient')

import { useArticulos, useCategorias, usePrestamos } from '../features/almacen/useAlmacen'
import { usePadronUsuarios } from '../features/admin/usuarios/usePadronUsuarios'

const mockUseArticulos = vi.mocked(useArticulos)
const mockUseCategorias = vi.mocked(useCategorias)
const mockUsePrestamos = vi.mocked(usePrestamos)
const mockUsePadronUsuarios = vi.mocked(usePadronUsuarios)

const mockArticulos = [
  {
    articuloId: 1,
    nombre: 'Martillo',
    categoria: 'Herramienta',
    stock: 5,
    stockMinimo: 2,
    bajoMinimo: false,
    ubicacion: 'Bodega A',
  },
  {
    articuloId: 2,
    nombre: 'Pala',
    categoria: 'Herramienta',
    stock: 1,
    stockMinimo: 3,
    bajoMinimo: true,
    ubicacion: 'Bodega B',
  },
]

const mockPrestamos = [
  {
    prestamoId: 10,
    articuloId: 1,
    nombreArticulo: 'Martillo',
    usuarioId: 5,
    nombreUsuario: 'Juan López',
    correoUsuario: 'juan@e.com',
    cantidad: 2,
    fechaPrestamo: '2026-10-01T10:00:00',
    fechaDevolucion: undefined,
    estado: 'PRESTADO' as const,
    notas: undefined,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockUseArticulos.mockReturnValue({
    articulos: mockArticulos,
    loading: false,
    error: null,
    recargar: vi.fn(),
  })
  mockUseCategorias.mockReturnValue({
    categorias: [{ categoriaId: 1, nombre: 'Herramienta' }],
    loading: false,
    error: null,
    recargar: vi.fn(),
  })
  mockUsePrestamos.mockReturnValue({
    prestamos: mockPrestamos,
    loading: false,
    error: null,
    recargar: vi.fn(),
  })
  mockUsePadronUsuarios.mockReturnValue({
    data: [{ usuarioId: 5, nombre: 'Juan López', correo: 'juan@e.com', perfil: 'Residente', bActivo: true }],
    loading: false,
    error: null,
    refetch: vi.fn(),
  })
})

describe('AdminAlmacenPage', () => {
  it('muestra tabs y título de inventario', () => {
    render(<AdminAlmacenPage />)
    expect(screen.getByRole('tab', { name: 'Inventario' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Préstamos' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Categorías' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Inventario' })).toBeInTheDocument()
  })

  it('muestra artículos en la tabla de inventario', () => {
    render(<AdminAlmacenPage />)
    expect(screen.getAllByText('Martillo').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Pala').length).toBeGreaterThanOrEqual(1)
  })

  it('muestra badge Bajo mínimo para artículo con stock < mínimo', () => {
    render(<AdminAlmacenPage />)
    expect(screen.getAllByText('Bajo mínimo').length).toBeGreaterThan(0)
  })

  it('abre panel al pulsar Nuevo artículo', async () => {
    render(<AdminAlmacenPage />)
    fireEvent.click(screen.getByRole('button', { name: /Nuevo artículo/i }))
    expect(screen.getByLabelText(/Nombre/i)).toBeInTheDocument()
  })

  it('tab Préstamos muestra lista de préstamos', async () => {
    render(<AdminAlmacenPage />)
    fireEvent.click(screen.getByRole('tab', { name: 'Préstamos' }))
    await waitFor(() => expect(screen.getAllByText('Juan López').length).toBeGreaterThanOrEqual(1))
    expect(screen.getAllByText('PRESTADO').length).toBeGreaterThanOrEqual(1)
  })

  it('devolver préstamo usa ConfirmDialog y apiPatch', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.apiPatch).mockResolvedValue({ status: 204 })
    render(<AdminAlmacenPage />)
    fireEvent.click(screen.getByRole('tab', { name: 'Préstamos' }))
    await user.click(screen.getAllByLabelText(/Devolver préstamo de Martillo/i)[0])
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Devolver' }))
    await waitFor(() => {
      expect(apiClient.apiPatch).toHaveBeenCalledWith('/WMS/Prestamos/10/devolver', {})
    })
  })

  it('abre panel Registrar préstamo', async () => {
    render(<AdminAlmacenPage />)
    fireEvent.click(screen.getByRole('tab', { name: 'Préstamos' }))
    fireEvent.click(screen.getByRole('button', { name: /Registrar préstamo/i }))
    expect(screen.getByRole('heading', { name: 'Registrar préstamo' })).toBeInTheDocument()
  })

  it('muestra error de inventario vía toast', async () => {
    const { useToast } = await import('../shared/toast/ToastContext')
    const toast = useToast()
    mockUseArticulos.mockReturnValue({
      articulos: [],
      loading: false,
      error: 'No se pudo cargar el inventario',
      recargar: vi.fn(),
    })
    render(<AdminAlmacenPage />)
    expect(toast.error).toHaveBeenCalledWith('No se pudo cargar el inventario')
  })
})
