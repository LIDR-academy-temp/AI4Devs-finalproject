import { useCallback, useState } from 'react'

const STORAGE_KEY = 'cq-sidebar-collapsed'

function readInitial(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === null) return true
    return stored === '1'
  } catch {
    return true
  }
}

/** Sidebar desktop: colapsado por defecto; expandir/colapsar solo con botón (sin hover). */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(readInitial)

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const expand = useCallback(() => {
    setCollapsed(false)
    try {
      localStorage.setItem(STORAGE_KEY, '0')
    } catch {
      /* ignore */
    }
  }, [])

  return { collapsed, expanded: !collapsed, toggle, expand }
}
