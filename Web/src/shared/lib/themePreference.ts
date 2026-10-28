export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'cq-theme'

export function readStoredTheme(): ThemeMode {
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'dark' ? 'dark' : 'light'
}

export function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', mode === 'dark')
  document.documentElement.dataset.theme = mode
}

export function persistTheme(mode: ThemeMode) {
  localStorage.setItem(STORAGE_KEY, mode)
  applyTheme(mode)
}

/** Llamar antes del primer render de React (main.tsx). */
export function initThemeFromStorage() {
  applyTheme(readStoredTheme())
}
