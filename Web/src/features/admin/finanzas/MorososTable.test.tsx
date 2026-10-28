import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MorososTable } from './MorososTable'

describe('MorososTable', () => {
  it('shows empty state copy', () => {
    render(<MorososTable morosos={[]} loading={false} error={null} />)
    expect(screen.getByText(/sin morosos/i)).toBeInTheDocument()
    expect(screen.getByText(/período seleccionado/i)).toBeInTheDocument()
  })

  it('renders long resident name with accessible full text in title', () => {
    const longName = 'Aleksandra Wiśniewska-Kowalczyk de la Rosa y Asociados'
    render(
      <MorososTable
        morosos={[
          {
            usuarioId: 1,
            nombre: longName,
            casa: 'C-99',
            cuotasVencidas: 3,
            totalAdeudado: 999999.99,
          },
        ]}
        loading={false}
        error={null}
      />,
    )
    expect(screen.getByTitle(longName)).toBeInTheDocument()
  })
})
