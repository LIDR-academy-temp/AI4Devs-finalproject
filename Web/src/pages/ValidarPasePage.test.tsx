import '../test/stubToast'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ValidarPasePage } from './ValidarPasePage'

vi.mock('../features/visitas/useVisitasPase', () => ({
  validarPase: vi.fn(),
  usarPase: vi.fn(),
}))

describe('ValidarPasePage', () => {
  it('renderiza encabezado Validar pase QR', () => {
    render(<ValidarPasePage />)
    expect(screen.getByRole('heading', { name: 'Validar pase QR' })).toBeInTheDocument()
  })
})
