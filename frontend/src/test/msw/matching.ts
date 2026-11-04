// In-memory stand-in for the matching rules API of admin-matching (web-admin-matching design D10). Bodies are checked
// with MatchingRuleSetCreate / MatchingRuleSetPut / GlobalMatchingRulesPut of @recon/shared and every answer is parsed
// with MatchingRuleSetDetail / GlobalMatchingRules, so the fake cannot drift from the contract. Permission is checked
// before scope, anything outside the scope answers the same 404 as a missing id, and every write gives the rules new
// ids, like the API. Rules are answered by priority and then in the order they were saved, the order of the API.
// It does NOT decide business rules: a regex that does not compile, a repeated pattern, Pending, a status of another
// cycle, a name in use or a rule set in use are scripted by each test (respondNextMatching).
import {
  type ColumnRuleInput,
  GlobalMatchingRules,
  GlobalMatchingRulesPut,
  MatchingRuleSetCreate,
  MatchingRuleSetDetail,
  MatchingRuleSetPut,
  type SheetRuleInput,
} from '@recon/shared'
import { HttpResponse, http, type PathParams } from 'msw'
import { onTestFinished } from 'vitest'
import type { AccountSummary, ProviderSummary } from '@/lib/api/types'
import { MERCHANTS, USERS, type UserName } from './fixtures'
import { GLOBAL_RULES, RULE_SETS, type RuleSetRow, STATUSES } from './matching-fixtures'

export { RULE_SET_IDS } from './matching-fixtures'

const API = '*/api/v1'

export type MatchingRoute = 'create' | 'detail' | 'put' | 'globals' | 'putGlobals'

export interface MatchingRequestLog {
  route: MatchingRoute
  method: string
  url: string
  body: unknown
  status: number | null
}

export interface ScriptedMatchingError {
  status: number
  code: string
  message?: string
  details?: unknown
}

/** What the fake needs of the catalog of handlers.ts, read at each request (the catalog is reset per test). */
export interface MatchingCatalog {
  accounts: () => AccountSummary[]
  visibleProvider: (user: UserName, providerId: number) => ProviderSummary | undefined
}

function freshState() {
  return {
    ruleSets: structuredClone(RULE_SETS) as RuleSetRow[],
    globals: structuredClone(GLOBAL_RULES),
    requests: [] as MatchingRequestLog[],
    responses: new Map<MatchingRoute, ScriptedMatchingError[]>(),
    nextRuleSetId: 100,
    nextRuleId: 1000,
  }
}

let state = freshState()

export function resetMatching() {
  state = freshState()
}

/** The rule sets as they are now, for the list of a provider (accounts.ts). */
export const ruleSetRows = (): readonly RuleSetRow[] => state.ruleSets

/** The next request to `route` answers this error instead of resolving (a test scripts a domain rule). */
export function respondNextMatching(route: MatchingRoute, error: ScriptedMatchingError) {
  const queue = state.responses.get(route) ?? []
  queue.push(error)
  state.responses.set(route, queue)
}

export function matchingRequests(route: MatchingRoute): MatchingRequestLog[] {
  return state.requests.filter((r) => r.route === route)
}

/**
 * For one test, admin keeps account.manage but its scope is assigned to Merchant B only (design D8): GET /auth/me,
 * the scope of the fake and the 403 of PUT /matching-rules/global all see the same user.
 */
export function withScopedAdmin() {
  const { merchantScope, merchants } = USERS.admin
  USERS.admin.merchantScope = 'assigned'
  USERS.admin.merchants = MERCHANTS.filter((m) => m.merchantId === 2).map(({ merchantId, name }) => ({
    merchantId,
    name,
  }))
  onTestFinished(() => {
    USERS.admin.merchantScope = merchantScope
    USERS.admin.merchants = merchants
  })
}

// --- rules -----------------------------------------------------------------------------------------------------------

const newRuleId = () => {
  state.nextRuleId += 1
  return state.nextRuleId
}

const sheetRulesOf = (rules: SheetRuleInput[]) => rules.map((r) => ({ sheetRuleId: newRuleId(), ...r }))
const columnRulesOf = (rules: ColumnRuleInput[]) => rules.map((r) => ({ columnRuleId: newRuleId(), ...r }))

/** By priority, then in the order they were saved (ids grow in that order). */
function inApiOrder<T extends { priority: number }>(rules: T[], id: (rule: T) => number): T[] {
  return [...rules].sort((a, b) => a.priority - b.priority || id(a) - id(b))
}

function toDetail(row: RuleSetRow, provider: ProviderSummary, accounts: AccountSummary[]) {
  return MatchingRuleSetDetail.parse({
    ruleSetId: row.ruleSetId,
    name: row.name,
    isActive: row.isActive,
    provider: { providerId: provider.providerId, name: provider.name },
    accounts: accounts
      .filter((a) => a.matchingRuleSetId === row.ruleSetId)
      .map((a) => ({ accountId: a.accountId, name: a.name, isActive: a.isActive }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    sheetRules: inApiOrder(row.sheetRules, (r) => r.sheetRuleId),
    columnRules: inApiOrder(row.columnRules, (r) => r.columnRuleId),
    rowIgnoreRules: row.rowIgnoreRules,
  })
}

function toGlobals() {
  const { sheetRules, columnRules, rowIgnoreRules, statusAliases } = state.globals
  return GlobalMatchingRules.parse({
    sheetRules: inApiOrder(sheetRules, (r) => r.sheetRuleId),
    columnRules: inApiOrder(columnRules, (r) => r.columnRuleId),
    rowIgnoreRules,
    statusAliases: [...statusAliases].sort((a, b) => a.alias.localeCompare(b.alias, 'en', { sensitivity: 'base' })),
    statuses: STATUSES,
  })
}

// --- HTTP ------------------------------------------------------------------------------------------------------------

const error = (status: number, code: string, message: string, details?: unknown) =>
  HttpResponse.json({ code, message, ...(details === undefined ? {} : { details }) }, { status })
const notFound = (entity: string) => error(404, 'not_found', `${entity} not found`)
const canManage = (user: UserName) => USERS[user].permissions.includes('account.manage')

function invalid(issues: { path: PropertyKey[]; message: string }[]) {
  return error(
    400,
    'validation_error',
    'Invalid request',
    issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  )
}

interface RouteArgs {
  params: PathParams
  user: UserName
  body: unknown
}

export function createMatchingHandlers(caller: (request: Request) => UserName | null, catalog: MatchingCatalog) {
  /** A route of the fake: logs the request and honours the scripted answers of the tests. */
  const route =
    (name: MatchingRoute, resolve: (args: RouteArgs) => Response) =>
    async ({ request, params }: { request: Request; params: PathParams }) => {
      const url = new URL(request.url)
      const body = request.headers.get('content-type')?.includes('json') ? await request.clone().json() : undefined
      const log: MatchingRequestLog = { route: name, method: request.method, url: url.pathname, body, status: null }
      state.requests.push(log)
      const user = caller(request)
      if (!user) {
        log.status = 401
        return error(401, 'unauthorized', 'Unauthorized')
      }
      const scripted = state.responses.get(name)?.shift()
      const answer = scripted
        ? error(scripted.status, scripted.code, scripted.message ?? scripted.code, scripted.details)
        : resolve({ params, user, body })
      log.status = answer.status
      return answer
    }

  /** The rule set of the id and its provider, if the user may see them. */
  function visibleRuleSet(user: UserName, id: number) {
    const row = state.ruleSets.find((r) => r.ruleSetId === id)
    const provider = row && catalog.visibleProvider(user, row.providerId)
    return row && provider ? { row, provider } : undefined
  }

  const badId = () => error(400, 'validation_error', 'Invalid request', [{ path: 'ruleSetId', message: 'Invalid' }])
  const idOf = (params: PathParams) => (/^\d{1,10}$/.test(String(params.ruleSetId)) ? Number(params.ruleSetId) : null)

  return [
    http.post(
      `${API}/providers/:providerId/matching-rule-sets`,
      route('create', ({ params, user, body }) => {
        if (!canManage(user)) return error(403, 'forbidden', 'Forbidden')
        const provider = catalog.visibleProvider(user, Number(params.providerId))
        if (!provider) return notFound('Provider')
        const parsed = MatchingRuleSetCreate.safeParse(body)
        if (!parsed.success) return invalid(parsed.error.issues)
        state.nextRuleSetId += 1
        const row: RuleSetRow = {
          ruleSetId: state.nextRuleSetId,
          providerId: provider.providerId,
          name: parsed.data.name,
          isActive: parsed.data.isActive ?? true,
          sheetRules: sheetRulesOf(parsed.data.sheetRules),
          columnRules: columnRulesOf(parsed.data.columnRules),
          rowIgnoreRules: [],
        }
        state.ruleSets.push(row)
        return HttpResponse.json(toDetail(row, provider, catalog.accounts()), { status: 201 })
      }),
    ),

    // Registered before `:ruleSetId` so that `global` is never read as an id.
    http.get(
      `${API}/matching-rules/global`,
      route('globals', () => HttpResponse.json(toGlobals())),
    ),

    http.put(
      `${API}/matching-rules/global`,
      route('putGlobals', ({ user, body }) => {
        if (!canManage(user) || USERS[user].merchantScope !== 'all') return error(403, 'forbidden', 'Forbidden')
        const parsed = GlobalMatchingRulesPut.safeParse(body)
        if (!parsed.success) return invalid(parsed.error.issues)
        state.globals = {
          ...state.globals,
          sheetRules: sheetRulesOf(parsed.data.sheetRules),
          columnRules: columnRulesOf(parsed.data.columnRules),
          statusAliases: parsed.data.statusAliases,
        }
        return HttpResponse.json(toGlobals())
      }),
    ),

    http.get(
      `${API}/matching-rule-sets/:ruleSetId`,
      route('detail', ({ params, user }) => {
        const id = idOf(params)
        if (id === null) return badId()
        const found = visibleRuleSet(user, id)
        if (!found) return notFound('Rule set')
        return HttpResponse.json(toDetail(found.row, found.provider, catalog.accounts()))
      }),
    ),

    http.put(
      `${API}/matching-rule-sets/:ruleSetId`,
      route('put', ({ params, user, body }) => {
        if (!canManage(user)) return error(403, 'forbidden', 'Forbidden')
        const id = idOf(params)
        if (id === null) return badId()
        const found = visibleRuleSet(user, id)
        if (!found) return notFound('Rule set')
        const parsed = MatchingRuleSetPut.safeParse(body)
        if (!parsed.success) return invalid(parsed.error.issues)
        Object.assign(found.row, {
          name: parsed.data.name,
          isActive: parsed.data.isActive,
          sheetRules: sheetRulesOf(parsed.data.sheetRules),
          columnRules: columnRulesOf(parsed.data.columnRules),
        })
        return HttpResponse.json(toDetail(found.row, found.provider, catalog.accounts()))
      }),
    ),
  ]
}
