import { Outlet, useMatches } from '@tanstack/react-router'
import { useMe } from '@/lib/session/me'
import { ForbiddenPage } from '../pages/ForbiddenPage'

/** Authenticated shell. A route whose `staticData.requires` the role lacks renders "no access" instead. */
export function AppLayout() {
  const me = useMe()
  const required = useMatches({ select: (matches) => matches.flatMap((m) => m.staticData?.requires ?? []) })
  const allowed = required.every((permission) => me.permissions.includes(permission))

  return <main className="min-h-screen p-6">{allowed ? <Outlet /> : <ForbiddenPage />}</main>
}
