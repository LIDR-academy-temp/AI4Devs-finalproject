import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminMascotasPage } from './AdminMascotasPage'

vi.mock('../features/mascotas/useMascotas', () => ({
  usePadronMascotas: vi.fn(),
}))

import { usePadronMascotas } from '../features/mascotas/useMascotas'
import type { MascotaListItem } from '../shared/types/mascotas'
const mockUsePadron = usePadronMascotas as ReturnType<typeof vi.fn>

const sample: MascotaListItem[] = [
  {
    mascotaId: 1,
    usuarioId: 10,
    nombreUsuario: 'Ana García',
    correoUsuario: 'ana@test.com',
    nombreMascota: 'Firulais',
    tipoMascota: 'Perro',
    razaMascota: 'Labrador',
    razaLibre: undefined,
    vacunasAlDia: true,
    numeroCasa: 'A-101',
  },
  {
    mascotaId: 2,
    usuarioId: 11,
    nombreUsuario: 'Luis Pérez',
    correoUsuario: 'luis@test.com',
    nombreMascota: 'Michi',
    tipoMascota: 'Gato',
    razaMascota: undefined,
    razaLibre: 'Mestizo',
    vacunasAlDia: false,
    numeroCasa: 'B-205',
  },
]

function mockPadron(overrides: Partial<ReturnType<typeof usePadronMascotas>> = {}) {
  mockUsePadron.mockReturnValue({
    padron: [],
    loading: false,
    error: null,
    reload: vi.fn(),
    ...overrides,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AdminMascotasPage', () => {
  it('renderiza título Mascotas', () => {
    mockPadron()
    render(<AdminMascotasPage />)
    expect(screen.getByRole('heading', { name: 'Mascotas' })).toBeInTheDocument()
  })

  it('muestra estado de carga', () => {
    mockPadron({ loading: true })
    render(<AdminMascotasPage />)
    expect(screen.getByLabelText('Cargando mascotas')).toBeInTheDocument()
  })

  it('muestra vacío sin registros', () => {
    mockPadron()
    render(<AdminMascotasPage />)
    expect(screen.getByText(/sin mascotas/i)).toBeInTheDocument()
  })

  it('renderiza filas del padrón', () => {
    mockPadron({ padron: sample })
    render(<AdminMascotasPage />)
    expect(screen.getByText('Firulais')).toBeInTheDocument()
    expect(screen.getByText('Michi')).toBeInTheDocument()
    expect(screen.getByText('Ana García')).toBeInTheDocument()
  })

  it('badge vacunas al día', () => {
    mockPadron({ padron: [sample[0]] })
    render(<AdminMascotasPage />)
    const badges = screen.getAllByText('Al día')
    expect(badges.some((el) => el.classList.contains('badge'))).toBe(true)
  })

  it('badge vacunas pendiente', () => {
    mockPadron({ padron: [sample[1]] })
    render(<AdminMascotasPage />)
    const badges = screen.getAllByText('Pendiente')
    expect(badges.some((el) => el.classList.contains('badge'))).toBe(true)
  })

  it('muestra número de casa', () => {
    mockPadron({ padron: sample })
    render(<AdminMascotasPage />)
    expect(screen.getByText('A-101')).toBeInTheDocument()
    expect(screen.getByText('B-205')).toBeInTheDocument()
  })
})
