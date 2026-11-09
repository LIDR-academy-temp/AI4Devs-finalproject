import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MorososTable } from './MorososTable'

const selectionProps = {
  selectedKeys: new Set<string>(),
  onToggleRow: vi.fn(),
  onToggleAllVisible: vi.fn(),
}

describe('MorososTable', () => {
  it('shows empty state copy', () => {
    render(<MorososTable morosos={[]} loading={false} error={null} {...selectionProps} />)
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
            morasAplicadas: 2,
            totalMora: 200,
            totalAdeudado: 999999.99,
          },
        ]}
        loading={false}
        error={null}
        {...selectionProps}
      />,
    )
    expect(screen.getAllByTitle(longName).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/tienes 2 moras aplicadas/i)).toBeInTheDocument()
  })

  it('notifica error de carga vía toast', async () => {
    const { useToast } = await import('../../../shared/toast/ToastContext')
    const toast = useToast()
    render(<MorososTable morosos={[]} loading={false} error="Fallo morosos" {...selectionProps} />)
    expect(toast.error).toHaveBeenCalledWith('Fallo morosos')
  })
})
