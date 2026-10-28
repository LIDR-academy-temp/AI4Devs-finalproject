import type { ReactNode } from 'react'
import { vi } from 'vitest'

vi.mock('../features/theme/ThemeContext', () => {
  const api = {
    mode: 'light' as const,
    setMode: vi.fn(),
    toggleMode: vi.fn(),
  }
  return {
    ThemeProvider: ({ children }: { children: ReactNode }) => children,
    useTheme: () => api,
  }
})
