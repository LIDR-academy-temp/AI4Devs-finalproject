// Mounts the real app (router + QueryClient) on a memory history, optionally signed in as a seed user.
import type { AnyRoute } from '@tanstack/react-router'
import { createMemoryHistory } from '@tanstack/react-router'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '@/app/App'
import { createAppRouter } from '@/app/router'
import { createQueryClient } from '@/lib/query-client'
import { session } from '@/lib/session/session'
import type { UserName } from './msw/fixtures'
import { issueTokens } from './msw/handlers'

export interface RenderAppOptions {
  /** Signs in as this seed user before mounting. */
  as?: UserName
  /** Extra routes under the authenticated layout (built with `getParentRoute: () => appRoute`). */
  extraRoutes?: AnyRoute[]
}

export function renderApp(path: string, { as, extraRoutes }: RenderAppOptions = {}) {
  if (as) session.setTokens(issueTokens(as))
  const queryClient = createQueryClient({ retry: false })
  const history = createMemoryHistory({ initialEntries: [path] })
  const router = createAppRouter({ queryClient, history, extraRoutes })
  const user = userEvent.setup()
  const view = render(<App router={router} queryClient={queryClient} />)
  return { ...view, router, queryClient, history, user }
}
