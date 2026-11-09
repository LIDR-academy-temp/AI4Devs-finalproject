export type ThemeId =
  | 'classic-light'
  | 'classic-dark'
  | 'hearth-light'
  | 'hearth-dark'
  | 'hearth-auto'

const STORAGE_KEY = 'cq-theme'

const VALID: ThemeId[] = [
  'classic-light',
  'classic-dark',
  'hearth-light',
  'hearth-dark',
  'hearth-auto',
]

function isThemeId(value: string | null): value is ThemeId {
  return value !== null && (VALID as string[]).includes(value)
}

/** Sin preferencia guardada: hearth-auto respeta prefers-color-scheme (AC-04). */
export function readStoredTheme(): ThemeId | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light') return 'classic-light'
    if (v === 'dark') return 'classic-dark'
    return isThemeId(v) ? v : null
  } catch {
    return null
  }
}

export function resolveInitialTheme(): ThemeId {
  return readStoredTheme() ?? 'hearth-auto'
}

export function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme
  document.documentElement.classList.toggle('dark', themeIsDark(theme))
}

export function persistTheme(theme: ThemeId) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* ignore */
  }
  applyTheme(theme)
}

/** Llamar antes del primer render de React (main.tsx). */
export function initThemeFromStorage() {
  applyTheme(resolveInitialTheme())
}

export function themeIsDark(theme: ThemeId): boolean {
  if (theme === 'classic-dark' || theme === 'hearth-dark') return true
  if (theme === 'hearth-auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return false
}
