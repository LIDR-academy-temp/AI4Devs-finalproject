import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AdminMobileCardList } from './AdminMobileCardList'

describe('AdminMobileCardList', () => {
  it('muestra mensaje vacío sin filas', () => {
    render(
      <AdminMobileCardList<{ id: number; name: string }>
        rows={[]}
        getRowKey={(r) => r.id}
        renderCard={(r) => <span>{r.name}</span>}
        emptyMessage="Nada aquí"
      />,
    )
    expect(screen.getByText('Nada aquí')).toBeInTheDocument()
  })

  it('renderiza una card por fila', () => {
    render(
      <AdminMobileCardList
        rows={[{ id: 1, name: 'A' }, { id: 2, name: 'B' }]}
        getRowKey={(r) => r.id}
        renderCard={(r) => <div className="cq-admin-mobile-card">{r.name}</div>}
      />,
    )
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })
})
