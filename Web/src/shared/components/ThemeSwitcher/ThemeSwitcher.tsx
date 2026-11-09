import { Moon, Sun } from 'lucide-react'
import { THEMES, useTheme, type ThemeId } from '../../../features/theme/ThemeContext'

export function ThemeSwitcher() {
  const { theme, setTheme, toggleDark, isDark } = useTheme()

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Selección de tema">
      <button
        type="button"
        onClick={toggleDark}
        aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
        aria-pressed={isDark}
        className="flex cursor-pointer items-center justify-center rounded-lg p-2 text-white/85 transition-colors hover:bg-white/10"
      >
        {isDark ? (
          <Sun className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Moon className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as ThemeId)}
        aria-label="Familia de tema"
        className="cursor-pointer rounded-md border border-white/20 bg-white/10 px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40"
      >
        {THEMES.map((t) => (
          <option key={t.id} value={t.id} className="text-neutral-900">
            {t.label}
          </option>
        ))}
      </select>
    </div>
  )
}
