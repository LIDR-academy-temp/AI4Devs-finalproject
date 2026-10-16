import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { logout } from '@/lib/session/auth-api'
import { useMe } from '@/lib/session/me'
import { strings } from './strings'

export function Header() {
  const me = useMe()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const merchants =
    me.merchantScope === 'all'
      ? strings.allMerchants
      : me.merchants.map((m) => m.name).join(', ') || strings.noMerchants

  async function signOut() {
    await logout()
    queryClient.clear()
    await navigate({ to: '/login', replace: true })
  }

  return (
    <header className="flex items-center justify-end gap-3 border-b px-6 py-3 text-sm">
      <span className="font-medium">{me.displayName}</span>
      <Badge variant="secondary">{me.role}</Badge>
      <span className="text-muted-foreground">{merchants}</span>
      <Button variant="outline" size="sm" onClick={signOut}>
        {strings.signOut}
      </Button>
    </header>
  )
}
