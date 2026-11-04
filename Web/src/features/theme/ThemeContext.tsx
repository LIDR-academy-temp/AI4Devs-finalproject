import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  applyTheme,
  persistTheme,
  readStoredTheme,
  resolveInitialTheme,
  themeIsDark,
  type ThemeId,
} from '../../shared/lib/themePreference'

export type { ThemeId }

export interface ThemeDescriptor {
  id: ThemeId
  label: string
  family: 'classic' | 'hearth'
  dark: boolean
}

export const THEMES: ThemeDescriptor[] = [
  { id: 'classic-light', label: 'Clásico', family: 'classic', dark: false },
  { id: 'classic-dark', label: 'Clásico oscuro', family: 'classic', dark: true },
  { id: 'hearth-light', label: 'Hearth', family: 'hearth', dark: false },
  { id: 'hearth-dark', label: 'Hearth oscuro', family: 'hearth', dark: true },
  { id: 'hearth-auto', label: 'Hearth automático', family: 'hearth', dark: false },
]

export interface ThemeContextValue {
  theme: ThemeId
  setTheme: (id: ThemeId) => void
  toggleDark: () => void
  isDark: boolean
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => resolveInitialTheme())
  const [systemDark, setSystemDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  useEffect(() => {
    applyTheme(theme)
    if (readStoredTheme() !== theme) {
      persistTheme(theme)
    }
  }, [theme])

  useEffect(() => {
    if (theme === 'hearth-auto') {
      applyTheme('hearth-auto')
    }
  }, [theme, systemDark])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemDark(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id)
  }, [])

  const toggleDark = useCallback(() => {
    setThemeState((current) => {
      if (current === 'hearth-auto') {
        return systemDark ? 'hearth-light' : 'hearth-dark'
      }
      const meta = THEMES.find((t) => t.id === current)
      if (!meta) return current
      const sibling = THEMES.find(
        (t) => t.family === meta.family && t.dark !== meta.dark && t.id !== 'hearth-auto',
      )
      return sibling?.id ?? current
    })
  }, [systemDark])

  const isDark = useMemo(() => {
    if (theme === 'hearth-auto') return systemDark
    return themeIsDark(theme)
  }, [theme, systemDark])

  const value = useMemo(
    () => ({ theme, setTheme, toggleDark, isDark }),
    [theme, setTheme, toggleDark, isDark],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider')
  return ctx
}
