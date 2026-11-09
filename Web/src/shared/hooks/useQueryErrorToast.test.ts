import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useQueryErrorToast } from './useQueryErrorToast'

const mockError = vi.fn()

vi.mock('../toast/ToastContext', () => ({
  useToast: () => ({
    error: mockError,
    success: vi.fn(),
    show: vi.fn(),
    dismiss: vi.fn(),
  }),
}))

describe('useQueryErrorToast', () => {
  beforeEach(() => {
    mockError.mockClear()
  })

  it('muestra toast cuando hay error', () => {
    renderHook(() => useQueryErrorToast('falló la red'))
    expect(mockError).toHaveBeenCalledWith('falló la red')
  })

  it('no repite el mismo mensaje sin cambio', () => {
    const { rerender } = renderHook(({ msg }) => useQueryErrorToast(msg), {
      initialProps: { msg: 'x' as string | null },
    })
    expect(mockError).toHaveBeenCalledTimes(1)
    rerender({ msg: 'x' })
    expect(mockError).toHaveBeenCalledTimes(1)
    rerender({ msg: 'y' })
    expect(mockError).toHaveBeenCalledTimes(2)
  })
})
