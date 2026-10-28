import '../../../test/stubToast'
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
    expect(screen.getAllByTitle(longName).length).toBeGreaterThanOrEqual(1)
  })

  it('notifica error de carga vía toast', async () => {
    const { useToast } = await import('../../../shared/toast/ToastContext')
    const toast = useToast()
    render(<MorososTable morosos={[]} loading={false} error="Fallo morosos" />)
    expect(toast.error).toHaveBeenCalledWith('Fallo morosos')
  })
})
