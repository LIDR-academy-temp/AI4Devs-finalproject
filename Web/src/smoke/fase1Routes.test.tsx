import { describe, expect, it, vi, beforeAll } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { AuthProvider } from '../features/auth/AuthContext'
import App from '../App'

/**
 * SMK-WEB-2: rutas Fase 1 registradas (smoke estático, sin E2E).
 * E2E con TDD → ticket Fase 2 + Playwright.
 */

// El AuthProvider llama refreshOnce() al montar, que hace fetch al API.
// En tests no hay servidor — silenciar con un mock que retorna 401.
beforeAll(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(null, { status: 401, statusText: 'Unauthorized' }),
    ),
  )
})

describe('Fase1 smoke routes', () => {
  it('SMK-WEB-2: /login renderiza sin lanzar', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <App />
        </MemoryRouter>
      </AuthProvider>,
    )
    // FE-UX-002: hero + card login
    expect(screen.getByRole('heading', { name: /tu comunidad/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })
})
