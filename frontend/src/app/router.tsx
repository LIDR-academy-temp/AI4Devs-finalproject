// Route tree in code (design D3): public /login, everything else under the authenticated layout.
import type { QueryClient } from '@tanstack/react-query'
import {
  type AnyRoute,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  type RouterHistory,
  redirect,
} from '@tanstack/react-router'
import { AccountsPage, validateAccountsSearch } from '@/features/accounts/AccountsPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { ImportPage } from '@/features/imports/ImportPage'
import { NewReconciliationPage } from '@/features/imports/NewReconciliationPage'
import { strings as importStrings } from '@/features/imports/strings'
import { validateImportSearch, validateNewReconciliationSearch } from '@/features/imports/validate-search'
import { ApiError } from '@/lib/api/client'
import type { Permission } from '@/lib/api/types'
import { meQuery } from '@/lib/session/me'
import { session } from '@/lib/session/session'
import { AppLayout } from './layout/AppLayout'
import { strings } from './layout/strings'
import { DashboardPage } from './pages/DashboardPage'
import { NotFoundPage } from './pages/NotFoundPage'

export interface RouterContext {
  queryClient: QueryClient
}

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    /** Permission the role needs to see the route (presentation only: the API enforces it). */
    requires?: Permission
    /** Position in the screen map after Dashboard, e.g. ['Administration', 'Accounts']. */
    crumbs?: readonly string[]
  }
}

export interface LoginSearch {
  redirect?: string
  reason?: 'expired'
}

const rootRoute = createRootRouteWithContext<RouterContext>()()

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
    reason: search.reason === 'expired' ? 'expired' : undefined,
  }),
  beforeLoad: () => {
    if (session.hasSession()) throw redirect({ to: '/' })
  },
  component: LoginPage,
})

/** Authenticated layout: requires a session and loads the identity before any screen renders. */
export const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: async ({ context, location }) => {
    const toLogin = () => redirect({ to: '/login', search: { redirect: location.href } })
    if (!session.hasSession()) throw toLogin()
    try {
      await context.queryClient.ensureQueryData(meQuery)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) throw toLogin()
      throw error
    }
  },
  component: AppLayout,
})

const dashboardRoute = createRoute({ getParentRoute: () => appRoute, path: '/', component: DashboardPage })

const accountsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/accounts',
  validateSearch: validateAccountsSearch,
  staticData: { crumbs: [strings.groups.administration, strings.screens.accounts] },
  component: AccountsPage,
})

const newReconciliationRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/reconciliations/new',
  validateSearch: validateNewReconciliationSearch,
  staticData: {
    requires: 'settlement.process',
    crumbs: [strings.groups.reconciliation, strings.screens.newReconciliation],
  },
  component: NewReconciliationPage,
})

// No permission required: the API decides the scope and viewer may read an import (design D2, D10).
const importRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/imports/$importId',
  validateSearch: validateImportSearch,
  staticData: { crumbs: [strings.groups.reconciliation, importStrings.importTitle] },
  component: ImportPage,
})

const notFoundRoute = createRoute({ getParentRoute: () => appRoute, path: '$', component: NotFoundPage })

function buildRouteTree(extraRoutes: AnyRoute[]) {
  return rootRoute.addChildren([
    loginRoute,
    appRoute.addChildren([
      dashboardRoute,
      accountsRoute,
      newReconciliationRoute,
      importRoute,
      ...extraRoutes,
      notFoundRoute,
    ]),
  ])
}

export interface CreateAppRouterOptions {
  queryClient: QueryClient
  history?: RouterHistory
  /** Test-only routes under the authenticated layout. */
  extraRoutes?: AnyRoute[]
}

export function createAppRouter({ queryClient, history, extraRoutes = [] }: CreateAppRouterOptions) {
  return createRouter({
    routeTree: buildRouteTree(extraRoutes),
    context: { queryClient },
    history,
    defaultPreload: false,
  })
}

export type AppRouter = ReturnType<typeof createAppRouter>

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter
  }
}
