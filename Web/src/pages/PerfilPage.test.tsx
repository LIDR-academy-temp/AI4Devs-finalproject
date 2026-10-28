import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { PerfilPage } from './PerfilPage'

vi.mock('../shared/lib/apiClient', () => ({
  apiGet: vi.fn().mockResolvedValue({
    status: 200,
    data: {
      usuarioId: 1,
      nombre: 'Ana',
      correo: 'ana@test.com',
      telefono: '555',
      perfil: 'Residente',
    },
  }),
  apiPut: vi.fn(),
}))

vi.mock('../features/vehiculos/useVehiculos', () => ({
  useVehiculos: () => ({ vehiculos: [], loading: false, error: null, refetch: vi.fn() }),
}))

vi.mock('../features/mascotas/useMascotas', () => ({
  useMascotas: () => ({ mascotas: [], loading: false, error: null, reload: vi.fn() }),
}))

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({
    session: {
      token: 't',
      usuarioId: 1,
      perfil: 'Residente',
      nombre: 'Ana',
      expira: new Date().toISOString(),
      requiereCambioPassword: false,
    },
    logout: vi.fn(),
  }),
}))

describe('PerfilPage', () => {
  it('muestra accesos a vehículos y mascotas', async () => {
    render(
      <MemoryRouter>
        <PerfilPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /administrar vehículos/i })).toHaveAttribute(
        'href',
        '/mis-vehiculos',
      )
      expect(screen.getByRole('link', { name: /administrar mascotas/i })).toHaveAttribute(
        'href',
        '/mis-mascotas',
      )
    })
  })

  it('carga y muestra correo del perfil', async () => {
    render(
      <MemoryRouter>
        <PerfilPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('ana@test.com')).toBeInTheDocument()
    })
  })
})
