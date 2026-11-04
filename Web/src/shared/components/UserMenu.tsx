import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, KeyRound, LogOut, Moon, Sun, User } from 'lucide-react'
import { useAuth } from '../../features/auth/AuthContext'
import { useTheme } from '../../features/theme/ThemeContext'

type UserMenuProps = {
  variant?: 'header' | 'default'
}

export function UserMenu({ variant = 'default' }: UserMenuProps) {
  const { session, logout } = useAuth()
  const { isDark, toggleDark } = useTheme()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const nombre = session?.nombre ?? 'Usuario'
  const perfil = session?.perfil ?? ''
  const initials = nombre
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  const go = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Menú de ${nombre}`}
        className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-white transition-colors hover:bg-white/10 ${
          variant === 'header' ? 'ring-1 ring-white/10 bg-white/5' : ''
        }`}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white ring-2 ring-white/20">
          {initials}
        </span>
        {variant === 'default' && (
          <>
            <span className="hidden text-sm lg:inline">{nombre}</span>
            {perfil && (
              <span className="hidden rounded-full bg-primary-light/25 px-2 py-0.5 text-[10px] font-semibold text-primary-light lg:inline">
                {perfil}
              </span>
            )}
          </>
        )}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/70 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-xl border border-neutral-100 bg-surface-alt shadow-[var(--shadow-dropdown)]"
          style={{ animation: 'slideInDown 150ms ease-out' }}
        >
          {/* Cabecera del menú */}
          <div className="border-b border-neutral-100 px-4 py-3">
            <p className="text-sm font-semibold text-primary-dark">{nombre}</p>
            {perfil && (
              <p className="text-xs text-neutral">{perfil}</p>
            )}
          </div>

          <div className="py-1">
            <button
              role="menuitem"
              type="button"
              onClick={() => go('/perfil')}
              className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-900 hover:bg-primary-50"
            >
              <User className="h-4 w-4 text-neutral-700" />
              Mi Perfil
            </button>
            <button
              role="menuitem"
              type="button"
              onClick={() => go('/cambiar-password')}
              className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-900 hover:bg-primary-50"
            >
              <KeyRound className="h-4 w-4 text-neutral-700" />
              Cambiar contraseña
            </button>
            <button
              role="menuitem"
              type="button"
              onClick={() => go('/notificaciones')}
              className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-900 hover:bg-primary-50"
            >
              <Bell className="h-4 w-4 text-neutral-700" />
              Notificaciones
            </button>
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                toggleDark()
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-900 hover:bg-primary-50"
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-neutral-700" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4 text-neutral-700" aria-hidden="true" />
              )}
              {isDark ? 'Modo claro' : 'Modo oscuro'}
            </button>
          </div>

          <div className="border-t border-neutral-100 py-1">
            <button
              role="menuitem"
              type="button"
              onClick={() => void handleLogout()}
              className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-danger-light"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
