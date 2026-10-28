import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AdminSplitLayout } from './AdminSplitLayout'

describe('AdminSplitLayout', () => {
  it('aplica panel-open cuando el panel está abierto', () => {
    const { container } = render(
      <AdminSplitLayout
        panelOpen
        tablePane={<div>Tabla</div>}
        formPane={<div>Form</div>}
      />,
    )
    expect(container.querySelector('.cq-split.panel-open')).toBeTruthy()
    expect(screen.getByText('Form')).toBeInTheDocument()
  })
})
