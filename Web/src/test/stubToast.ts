import type { ReactNode } from 'react'
import { vi } from 'vitest'

vi.mock('../shared/toast/ToastContext', () => {
  const toastApi = {
    show: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  }
  return {
    ToastProvider: ({ children }: { children: ReactNode }) => children,
    useToast: () => toastApi,
  }
})
