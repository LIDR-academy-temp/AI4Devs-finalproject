import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.unmock('../../../features/theme/ThemeContext')

import { ThemeProvider } from '../../../features/theme/ThemeContext'
import { ThemeSwitcher } from './ThemeSwitcher'

describe('ThemeSwitcher', () => {
  afterEach(() => {
    localStorage.removeItem('cq-theme')
    delete document.documentElement.dataset.theme
    document.documentElement.classList.remove('dark')
  })

  it('muestra hearth-auto sin preferencia guardada', () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>,
    )
    expect(screen.getByLabelText(/familia de tema/i)).toHaveValue('hearth-auto')
  })

  it('toggle oscuro cambia data-theme en la familia hearth', async () => {
    localStorage.setItem('cq-theme', 'hearth-light')
    const user = userEvent.setup()

    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>,
    )

    await user.click(screen.getByRole('button', { name: /activar modo oscuro/i }))
    expect(document.documentElement.dataset.theme).toBe('hearth-dark')
    expect(localStorage.getItem('cq-theme')).toBe('hearth-dark')
  })

  it('select actualiza tema y localStorage', async () => {
    localStorage.setItem('cq-theme', 'hearth-light')
    const user = userEvent.setup()

    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>,
    )

    await user.selectOptions(screen.getByLabelText(/familia de tema/i), 'classic-light')
    expect(document.documentElement.dataset.theme).toBe('classic-light')
    expect(localStorage.getItem('cq-theme')).toBe('classic-light')
  })

  it('toggle desde hearth-auto con OS dark elige hearth-light', async () => {
    const prev = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-color-scheme: dark'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia

    localStorage.setItem('cq-theme', 'hearth-auto')
    const user = userEvent.setup()

    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>,
    )

    await user.click(screen.getByRole('button', { name: /activar modo claro/i }))
    expect(document.documentElement.dataset.theme).toBe('hearth-light')

    window.matchMedia = prev
  })
})
