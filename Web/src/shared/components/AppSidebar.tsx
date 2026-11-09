import { useNavegacion } from '../../features/navegacion/NavegacionContext'
import { SidebarGroup } from './SidebarGroup'
import { SidebarRailToggle } from './SidebarRailToggle'

interface AppSidebarProps {
  inDrawer?: boolean
  onItemClick?: () => void
  collapsed?: boolean
  onToggleCollapsed?: () => void
}

export function AppSidebar({
  inDrawer = false,
  onItemClick,
  collapsed = false,
  onToggleCollapsed,
}: AppSidebarProps) {
  const { groups, items, loading } = useNavegacion()

  const showLabels = inDrawer || !collapsed
  const visibilityClasses = inDrawer ? 'h-full' : 'hidden h-full md:flex'

  return (
    <nav
      aria-label="Principal"
      className={`cq-app-sidebar flex w-full flex-col border-r border-white/10 p-1.5 ${visibilityClasses} ${
        inDrawer ? '' : 'min-h-[calc(100vh-3.5rem)]'
      }`}
      onClick={inDrawer ? onItemClick : undefined}
    >
      {!inDrawer && onToggleCollapsed && (
        <div className="cq-nav-sidebar-toolbar shrink-0 border-b border-white/10 pb-1 mb-0.5">
          <SidebarRailToggle collapsed={collapsed} onToggle={onToggleCollapsed} />
        </div>
      )}

      <div className="cq-nav-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden py-0.5">
        {loading && showLabels && (
          <p className="px-2 text-xs text-white/50" aria-live="polite">Cargando menú…</p>
        )}
        {groups.map((group) => {
          const groupItems = items.filter((i) => i.group === group.key)
          return (
            <SidebarGroup
              key={group.key}
              group={group}
              items={groupItems}
              collapsed={inDrawer ? false : collapsed}
            />
          )
        })}
      </div>
    </nav>
  )
}
