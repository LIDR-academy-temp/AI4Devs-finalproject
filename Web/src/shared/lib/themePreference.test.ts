import { afterEach, describe, expect, it } from 'vitest'
import {
  applyTheme,
  persistTheme,
  readStoredTheme,
  resolveInitialTheme,
  themeIsDark,
} from './themePreference'

describe('themePreference', () => {
  afterEach(() => {
    localStorage.removeItem('cq-theme')
    document.documentElement.classList.remove('dark')
    delete document.documentElement.dataset.theme
  })

  it('sin storage resuelve hearth-auto', () => {
    expect(readStoredTheme()).toBeNull()
    expect(resolveInitialTheme()).toBe('hearth-auto')
  })

  it('migra light/dark legacy a classic', () => {
    localStorage.setItem('cq-theme', 'light')
    expect(readStoredTheme()).toBe('classic-light')
    localStorage.setItem('cq-theme', 'dark')
    expect(readStoredTheme()).toBe('classic-dark')
  })

  it('persiste y aplica hearth-dark', () => {
    persistTheme('hearth-dark')
    expect(readStoredTheme()).toBe('hearth-dark')
    expect(document.documentElement.dataset.theme).toBe('hearth-dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(themeIsDark('hearth-dark')).toBe(true)
  })

  it('applyTheme quita dark en hearth-light', () => {
    applyTheme('hearth-dark')
    applyTheme('hearth-light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.dataset.theme).toBe('hearth-light')
  })

  it('applyTheme hearth-auto con OS dark aplica clase dark', () => {
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

    applyTheme('hearth-auto')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    window.matchMedia = prev
  })
})
