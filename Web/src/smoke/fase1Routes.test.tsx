import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { AuthProvider } from '../features/auth/AuthContext'
import App from '../App'

/**
 * SMK-WEB-2: rutas Fase 1 registradas (smoke estático, sin E2E).
 * E2E con TDD → ticket Fase 2 + Playwright.
 */
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
