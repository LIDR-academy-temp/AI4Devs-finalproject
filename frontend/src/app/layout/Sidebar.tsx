import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { useMe } from '@/lib/session/me'
import { type NavItem, visibleNav } from './nav-config'
import { strings } from './strings'

const itemClass = 'flex items-center justify-between rounded-md px-3 py-1.5 text-sm'

function Entry({ item }: { item: NavItem }) {
  if (!item.to) {
    return (
      <span
        aria-disabled="true"
        title={strings.notAvailableYet}
        className={`${itemClass} cursor-not-allowed text-muted-foreground`}
      >
        <span>{item.label}</span>
        <Badge variant="outline" className="text-[10px]" aria-hidden="true">
          {strings.soon}
        </Badge>
      </span>
    )
  }
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: true, includeSearch: false }}
      className={`${itemClass} hover:bg-accent`}
      activeProps={{ className: 'bg-accent font-semibold' }}
    >
      {item.label}
    </Link>
  )
}

export function Sidebar() {
  const { permissions } = useMe()
  return (
    <aside className="w-60 shrink-0 border-r bg-background">
      <div className="px-5 py-4 text-lg font-semibold">{strings.appName}</div>
      <nav aria-label={strings.mainNav} className="flex flex-col gap-4 px-2 pb-6">
        {visibleNav(permissions).map((group) => (
          <div key={group.label ?? 'top'} className="flex flex-col gap-0.5">
            {group.label && (
              <h2 className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </h2>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.label}>
                  <Entry item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
