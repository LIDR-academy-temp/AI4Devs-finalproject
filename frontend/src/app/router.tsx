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
import { AccountDetailPage } from '@/features/accounts/AccountDetailPage'
import { AccountOverview } from '@/features/accounts/AccountOverview'
import { AccountsPage, validateAccountsSearch } from '@/features/accounts/AccountsPage'
import { ChannelAssignmentPage } from '@/features/accounts/ChannelAssignmentPage'
import { validateChannelAssignmentSearch } from '@/features/accounts/channel-assignment-search'
import { strings as accountStrings } from '@/features/accounts/strings'
import { LoginPage } from '@/features/auth/LoginPage'
import { AccountFeesPanel } from '@/features/fees/AccountFeesPanel'
import { FeesPage } from '@/features/fees/FeesPage'
import { validateFeesSearch } from '@/features/fees/fees-search'
import { ImportPage } from '@/features/imports/ImportPage'
import { NewReconciliationPage } from '@/features/imports/NewReconciliationPage'
import { strings as importStrings } from '@/features/imports/strings'
import { validateImportSearch, validateNewReconciliationSearch } from '@/features/imports/validate-search'
import { GlobalRulesPage } from '@/features/matching/GlobalRulesPage'
import { MatchingRulesPage } from '@/features/matching/MatchingRulesPage'
import { RuleSetPage } from '@/features/matching/RuleSetPage'
import { validateSettlementListSearch } from '@/features/settlements/list-search'
import { SettlementListPage } from '@/features/settlements/SettlementListPage'
import { SettlementReviewPage } from '@/features/settlements/SettlementReviewPage'
import { SettlementSummaryPage } from '@/features/settlements/SettlementSummaryPage'
import { validateSettlementSummarySearch } from '@/features/settlements/summary-search'
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

// Read only for every role: fees are created, edited and closed in the page of each account (web-admin-fees D2).
const feesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/fees',
  validateSearch: validateFeesSearch,
  staticData: { requires: 'fee.view', crumbs: [strings.groups.administration, strings.screens.fees] },
  component: FeesPage,
})

// No permission required: the API decides the scope; each tab is a child route (web-admin-accounts design D2).
const accountDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/accounts/$accountId',
  staticData: {
    crumbs: [strings.groups.administration, strings.screens.accounts, accountStrings.detail.crumb],
  },
  component: AccountDetailPage,
})

const accountOverviewRoute = createRoute({
  getParentRoute: () => accountDetailRoute,
  path: '/',
  component: AccountOverview,
})

// fee.view to read; the actions also need fee.manage, decided by the panel (web-admin-fees D2).
const accountFeesRoute = createRoute({
  getParentRoute: () => accountDetailRoute,
  path: 'fees',
  staticData: { requires: 'fee.view' },
  component: AccountFeesPanel,
})

// Read only for every role: channels join accounts by processing settlements (web-admin-accounts design D8).
const channelAssignmentRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/channel-assignment',
  validateSearch: validateChannelAssignmentSearch,
  staticData: { crumbs: [strings.groups.administration, strings.screens.channelAssignment] },
  component: ChannelAssignmentPage,
})

// No permission required: reading rules needs only a token; the writes are offered by permission and decided by the
// API. The static segment `global` wins over `$ruleSetId` (web-admin-matching design D2).
const matchingCrumbs = [strings.groups.administration, strings.screens.matchingRules] as const

const matchingRulesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/matching-rules',
  validateSearch: validateAccountsSearch,
  staticData: { crumbs: matchingCrumbs },
  component: MatchingRulesPage,
})

const globalRulesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/matching-rules/global',
  staticData: { crumbs: matchingCrumbs },
  component: GlobalRulesPage,
})

const ruleSetRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/matching-rules/$ruleSetId',
  staticData: { crumbs: matchingCrumbs },
  component: RuleSetPage,
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

// The form processes the batch: settlement.process, like New Reconciliation (web-settlement design D1, D13).
const settlementReviewRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/imports/$importId/settlement-review',
  staticData: {
    requires: 'settlement.process',
    crumbs: [strings.groups.reconciliation, strings.screens.settlementReview],
  },
  component: SettlementReviewPage,
})

// No permission required: viewer reads the attempts of the accounts of its scope (settlements-browse D7).
const settlementListRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/settlements',
  validateSearch: validateSettlementListSearch,
  staticData: { crumbs: [strings.groups.settlements, strings.screens.settlementList] },
  component: SettlementListPage,
})

// No permission required: the API decides the scope and viewer may read an attempt (design D13).
const settlementSummaryRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/settlements/$batchId',
  validateSearch: validateSettlementSummarySearch,
  staticData: { crumbs: [strings.groups.reconciliation, strings.screens.settlementSummary] },
  component: SettlementSummaryPage,
})

const notFoundRoute = createRoute({ getParentRoute: () => appRoute, path: '$', component: NotFoundPage })

function buildRouteTree(extraRoutes: AnyRoute[]) {
  return rootRoute.addChildren([
    loginRoute,
    appRoute.addChildren([
      dashboardRoute,
      accountsRoute,
      accountDetailRoute.addChildren([accountOverviewRoute, accountFeesRoute]),
      channelAssignmentRoute,
      matchingRulesRoute,
      globalRulesRoute,
      ruleSetRoute,
      feesRoute,
      newReconciliationRoute,
      importRoute,
      settlementReviewRoute,
      settlementListRoute,
      settlementSummaryRoute,
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
