import { useCallback, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

type HintState = { top: number; left: number } | null

export function useCollapsedNavHint(
  label: string,
  enabled: boolean,
): {
  targetRef: RefObject<HTMLElement | null>
  onShow: () => void
  onHide: () => void
  hintPortal: ReactNode
} {
  const targetRef = useRef<HTMLElement | null>(null)
  const [hint, setHint] = useState<HintState>(null)

  const onShow = useCallback(() => {
    if (!enabled || !targetRef.current) return
    const rect = targetRef.current.getBoundingClientRect()
    setHint({
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    })
  }, [enabled])

  const onHide = useCallback(() => setHint(null), [])

  const hintPortal =
    enabled && hint
      ? createPortal(
          <span
            role="tooltip"
            className="cq-nav-hint-fixed"
            style={{
              top: hint.top,
              left: hint.left,
              transform: 'translateY(-50%)',
            }}
          >
            {label}
          </span>,
          document.body,
        )
      : null

  return { targetRef, onShow, onHide, hintPortal }
}
