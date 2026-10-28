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
