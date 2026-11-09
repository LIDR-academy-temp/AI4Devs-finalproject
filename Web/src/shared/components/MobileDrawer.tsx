import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { AppSidebar } from './AppSidebar'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const firstFocusRef = useRef<HTMLButtonElement>(null)

  // Focus trap y cierre con Escape
  useEffect(() => {
    if (!isOpen) return
    firstFocusRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Bloquear scroll del body mientras está abierto
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menú de navegación"
      className="fixed inset-0 z-40 md:hidden"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        style={{ animation: 'fadeInBg 250ms ease-out' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="absolute inset-y-0 left-0 flex w-64 flex-col bg-primary-dark shadow-xl"
        style={{ animation: 'slideInLeft 250ms ease-out' }}
      >
        {/* Header del drawer */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold text-white">Menú</span>
          <button
            ref={firstFocusRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="cursor-pointer rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar dentro del drawer */}
        <div className="flex-1 overflow-y-auto">
          <AppSidebar inDrawer onItemClick={onClose} />
        </div>
      </div>
    </div>
  )
}
