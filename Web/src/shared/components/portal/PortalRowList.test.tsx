import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PortalRowList, PortalRowListItem } from './PortalRowList'

describe('PortalRowList', () => {
  it('aplica clases de filas alternadas', () => {
    const { container } = render(
      <PortalRowList>
        <PortalRowListItem>Fila 1</PortalRowListItem>
        <PortalRowListItem>Fila 2</PortalRowListItem>
      </PortalRowList>,
    )
    const list = container.querySelector('.cq-portal-row-list')
    const items = container.querySelectorAll('.cq-portal-row-list__item')
    expect(list).toBeTruthy()
    expect(items).toHaveLength(2)
  })
})
