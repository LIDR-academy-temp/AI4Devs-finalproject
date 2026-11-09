import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PortalPageLayout } from './PortalPageLayout'

describe('PortalPageLayout', () => {
  it('envuelve contenido en cq-admin-page y card', () => {
    const { container } = render(
      <PortalPageLayout width="3xl">
        <h1>Prueba</h1>
      </PortalPageLayout>,
    )
    expect(container.querySelector('.cq-admin-page')).toBeTruthy()
    expect(container.querySelector('.cq-portal-page-card')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Prueba' })).toBeInTheDocument()
  })
})
