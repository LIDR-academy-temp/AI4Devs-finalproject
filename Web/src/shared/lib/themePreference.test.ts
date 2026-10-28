import { afterEach, describe, expect, it } from 'vitest'
import { applyTheme, persistTheme, readStoredTheme } from './themePreference'

describe('themePreference', () => {
  afterEach(() => {
    localStorage.removeItem('cq-theme')
    document.documentElement.classList.remove('dark')
    delete document.documentElement.dataset.theme
  })

  it('lee light por defecto', () => {
    expect(readStoredTheme()).toBe('light')
  })

  it('persiste y aplica dark', () => {
    persistTheme('dark')
    expect(readStoredTheme()).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('applyTheme quita clase dark en light', () => {
    applyTheme('dark')
    applyTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
