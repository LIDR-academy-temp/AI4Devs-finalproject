import { useState } from 'react'
import { useSidebarCollapsed } from '../hooks/useSidebarCollapsed'
import { Link, Outlet } from 'react-router-dom'
import { Building2, Menu } from 'lucide-react'
import { NotificationBell } from '../../features/notifications/NotificationBell'
import { AppSidebar } from './AppSidebar'
import { Breadcrumbs } from './Breadcrumbs'
import { ModuleTitle } from './ModuleTitle'
import { MobileDrawer } from './MobileDrawer'
import { ThemeSwitcher } from './ThemeSwitcher/ThemeSwitcher'
import { UserMenu } from './UserMenu'
import '../../styles/app-shell.css'

const RAIL_WIDTH = '3.25rem'
const EXPANDED_WIDTH = '12.5rem'

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { collapsed, toggle } = useSidebarCollapsed()
  const appName = import.meta.env.VITE_APP_NAME ?? 'CuartaQuinientos'

  return (
    <div className="min-h-screen bg-surface">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-1 focus:text-primary-dark focus:shadow"
      >
        Saltar al contenido
      </a>

      <header className="cq-app-header sticky top-0 z-30 border-b border-white/10 shadow-[0_2px_14px_rgba(20,40,60,0.35)]">
        <div className="flex h-14 items-center gap-2 px-3 md:gap-4 md:px-5">
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setDrawerOpen(true)}
            className="flex cursor-pointer items-center justify-center rounded-lg p-2 text-white/85 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/" className="cq-app-brand flex shrink-0 items-center gap-2.5">
            <span className="cq-app-brand-mark flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
              <Building2 className="h-5 w-5 text-primary-light" aria-hidden="true" />
            </span>
            <span className="hidden text-[15px] font-semibold tracking-tight text-white sm:inline">
              {appName}
            </span>
          </Link>

          <div className="hidden h-7 w-px shrink-0 bg-white/15 md:block" aria-hidden="true" />

          <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
            <ModuleTitle />
            <Breadcrumbs />
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <ThemeSwitcher />
            <NotificationBell />
            <UserMenu variant="header" />
          </div>
        </div>

        <div className="border-t border-white/5 px-3 py-1.5 md:hidden">
          <Breadcrumbs />
        </div>
      </header>

      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <aside
          className="cq-app-sidebar-slot hidden shrink-0 transition-[width] duration-200 ease-out motion-reduce:transition-none md:block"
          style={{ width: collapsed ? RAIL_WIDTH : EXPANDED_WIDTH }}
        >
          <AppSidebar collapsed={collapsed} onToggleCollapsed={toggle} />
        </aside>
        <main id="main-content" className="min-w-0 flex-1 animate-[fadeInPage_0.35s_ease-out]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
