import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AdminListToolbar } from './AdminListToolbar'

describe('AdminListToolbar', () => {
  it('renderiza título, métricas y CTA', () => {
    render(
      <AdminListToolbar
        title="Casas"
        metrics={[{ label: 'Casas', value: 2 }]}
        primaryAction={{ label: 'Nueva', onClick: vi.fn(), iconClass: 'mdi mdi-plus' }}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Casas' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Resumen' })).toHaveTextContent('2')
    expect(screen.getByRole('button', { name: /nueva/i })).toBeInTheDocument()
  })
})
