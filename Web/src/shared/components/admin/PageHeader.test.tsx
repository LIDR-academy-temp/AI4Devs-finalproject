import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  it('renderiza título, descripción y acciones', () => {
    render(
      <PageHeader
        title="Casas"
        description="Gestión de viviendas"
        actions={<button type="button">Nueva</button>}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Casas' })).toBeInTheDocument()
    expect(screen.getByText('Gestión de viviendas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nueva' })).toBeInTheDocument()
  })
})
