import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Home } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { SidebarItem } from './SidebarItem'
import type { NavItem } from '../navigation/appNavigation'

const item: NavItem = {
  label: 'Inicio',
  path: '/',
  group: 'cuenta',
  icon: Home,
  implemented: true,
  order: 0,
}

describe('SidebarItem colapsado', () => {
  it('muestra tooltip con el nombre al hover', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SidebarItem item={item} active={false} collapsed />
      </MemoryRouter>,
    )
    await user.hover(screen.getByRole('link', { name: 'Inicio' }))
    expect(screen.getByRole('tooltip')).toHaveTextContent('Inicio')
  })
})
