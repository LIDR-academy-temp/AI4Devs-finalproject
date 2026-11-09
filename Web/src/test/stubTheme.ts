import type { ReactNode } from 'react'
import { vi } from 'vitest'

vi.mock('../features/theme/ThemeContext', () => {
  const api = {
    theme: 'hearth-light' as const,
    setTheme: vi.fn(),
    toggleDark: vi.fn(),
    isDark: false,
  }
  return {
    ThemeProvider: ({ children }: { children: ReactNode }) => children,
    useTheme: () => api,
    THEMES: [],
  }
})
