import { Outlet, useMatches } from '@tanstack/react-router'
import { ListFocusReset } from '@/lib/list-focus'
import { useMe } from '@/lib/session/me'
import { ForbiddenPage } from '../pages/ForbiddenPage'
import { Breadcrumbs } from './Breadcrumbs'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

/** Authenticated shell. A route whose `staticData.requires` the role lacks renders "no access" instead. */
export function AppLayout() {
  const me = useMe()
  const required = useMatches({ select: (matches) => matches.flatMap((m) => m.staticData?.requires ?? []) })
  const allowed = required.every((permission) => me.permissions.includes(permission))

  return (
    <div className="flex min-h-screen bg-muted/40">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex flex-col gap-4 p-6">
          <Breadcrumbs />
          {allowed ? <Outlet /> : <ForbiddenPage />}
          <ListFocusReset />
        </main>
      </div>
    </div>
  )
}
