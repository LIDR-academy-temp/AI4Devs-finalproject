// In-memory stand-in for the account administration API of admin-accounts (web-admin-accounts design D9). Bodies are
// checked with AccountCreate / AccountPatch of @recon/shared and every answer is parsed with its schema
// (AccountDetail, MatchingRuleSetSummary), so the fake cannot drift from the contract. Permission is checked before
// scope, and anything outside the scope answers the same 404 as a missing id. The fake stores what the writes change
// in the catalog of handlers.ts. It does NOT decide business rules: a taken name, a rule set of another provider or
// a fee source that is not valid are scripted by each test (respondNextAccount); copying fees is not modelled.
import { AccountCreate, AccountDetail, AccountPatch, MatchingRuleSetSummary } from '@recon/shared'
import { HttpResponse, http, type PathParams } from 'msw'
import type { AccountSummary, ProviderSummary } from '@/lib/api/types'
import { fixed } from './fees'
import { ACCOUNT_CREATOR, MERCHANTS, USERS, type UserName } from './fixtures'

const API = '*/api/v1'

/** The rule sets of the fake: Provider C legacy is the one of the seed; the retired one is inactive. */
export const RULE_SET_IDS = { legacy: 3, retired: 4 } as const

const RULE_SETS = [
  { ruleSetId: RULE_SET_IDS.legacy, providerId: 201, name: 'Provider C legacy', isActive: true },
  { ruleSetId: RULE_SET_IDS.retired, providerId: 201, name: 'Provider C retired', isActive: false },
]

export type AccountRoute = 'create' | 'patch' | 'ruleSets'

export interface AccountRequestLog {
  route: AccountRoute
  method: string
  url: string
  body: unknown
  status: number | null
}

export interface ScriptedAccountError {
  status: number
  code: string
  message?: string
  details?: unknown
}

/** What the fake needs of the catalog of handlers.ts, read at each request (the catalog is reset per test). */
export interface Catalog {
  accounts: () => AccountSummary[]
  visibleProvider: (user: UserName, providerId: number) => ProviderSummary | undefined
}

function freshState() {
  return {
    /** Who created an account and when it last changed, for the accounts a write touched. */
    meta: new Map<string, { createdBy: { userId: number; userName: string }; updatedAt: string }>(),
    requests: [] as AccountRequestLog[],
    responses: new Map<AccountRoute, ScriptedAccountError[]>(),
    tick: 0,
    seq: 0,
  }
}

let state = freshState()

export function resetAccounts() {
  state = freshState()
}

/** The next request to `route` answers this error instead of resolving (a test scripts a domain rule). */
export function respondNextAccount(route: AccountRoute, error: ScriptedAccountError) {
  const queue = state.responses.get(route) ?? []
  queue.push(error)
  state.responses.set(route, queue)
}

export function accountRequests(route: AccountRoute): AccountRequestLog[] {
  return state.requests.filter((r) => r.route === route)
}

function nextInstant(): string {
  state.tick += 1
  return new Date(Date.UTC(2026, 10, 3, 16, 0, state.tick)).toISOString()
}

/** GET /accounts/{id} and the writes answer the same detail, parsed with the schema of the contract. */
export function toAccountDetail(account: AccountSummary, provider: ProviderSummary) {
  const merchant = MERCHANTS.find((m) => m.merchantId === provider.merchantId)!
  const meta = state.meta.get(account.accountId)
  return AccountDetail.parse({
    ...account,
    provider,
    merchant: { merchantId: merchant.merchantId, name: merchant.name },
    createdBy: meta?.createdBy ?? ACCOUNT_CREATOR,
    updatedAt: meta?.updatedAt ?? account.createdAt,
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

export function createAccountHandlers(caller: (request: Request) => UserName | null, catalog: Catalog) {
  /** A route of the fake: logs the request and honours the scripted answers of the tests. */
  const route =
    (name: AccountRoute, resolve: (args: RouteArgs) => Response) =>
    async ({ request, params }: { request: Request; params: PathParams }) => {
      const url = new URL(request.url)
      const body = request.headers.get('content-type')?.includes('json') ? await request.clone().json() : undefined
      const log: AccountRequestLog = { route: name, method: request.method, url: url.pathname, body, status: null }
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

  return [
    http.post(
      `${API}/providers/:providerId/accounts`,
      route('create', ({ params, user, body }) => {
        if (!canManage(user)) return error(403, 'forbidden', 'Forbidden')
        const provider = catalog.visibleProvider(user, Number(params.providerId))
        if (!provider) return notFound('Provider')
        const parsed = AccountCreate.safeParse(body)
        if (!parsed.success) return invalid(parsed.error.issues)
        state.seq += 1
        const createdAt = nextInstant()
        const account: AccountSummary = {
          accountId: `a1000000-0000-4000-8000-${String(state.seq).padStart(12, '0')}`,
          providerId: provider.providerId,
          name: parsed.data.name,
          chargebackReservePolicy: parsed.data.chargebackReservePolicy,
          // The API answers the cap as Money4 (admin-accounts scenario "Tope de reserva normalizado").
          rollingReserveCapAmt: fixed(parsed.data.rollingReserveCapAmt, 4),
          matchingRuleSetId: parsed.data.matchingRuleSetId ?? null,
          isActive: true,
          createdAt,
        }
        catalog.accounts().push(account)
        state.meta.set(account.accountId, {
          createdBy: { userId: USERS[user].userId, userName: USERS[user].userName },
          updatedAt: createdAt,
        })
        return HttpResponse.json(toAccountDetail(account, provider), { status: 201 })
      }),
    ),

    http.patch(
      `${API}/accounts/:accountId`,
      route('patch', ({ params, user, body }) => {
        if (!canManage(user)) return error(403, 'forbidden', 'Forbidden')
        const accounts = catalog.accounts()
        const index = accounts.findIndex((a) => a.accountId === params.accountId)
        const current = accounts[index]
        const provider = current && catalog.visibleProvider(user, current.providerId)
        if (!current || !provider) return notFound('Account')
        const parsed = AccountPatch.safeParse(body)
        if (!parsed.success) return invalid(parsed.error.issues)
        const { reason: _reason, ...changes } = parsed.data
        const next: AccountSummary = { ...current, ...changes }
        if (changes.rollingReserveCapAmt !== undefined)
          next.rollingReserveCapAmt = fixed(changes.rollingReserveCapAmt, 4)
        accounts[index] = next
        state.meta.set(next.accountId, {
          createdBy: state.meta.get(next.accountId)?.createdBy ?? ACCOUNT_CREATOR,
          updatedAt: nextInstant(),
        })
        return HttpResponse.json(toAccountDetail(next, provider))
      }),
    ),

    http.get(
      `${API}/providers/:providerId/matching-rule-sets`,
      route('ruleSets', ({ params, user }) => {
        const provider = catalog.visibleProvider(user, Number(params.providerId))
        if (!provider) return notFound('Provider')
        const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)
        const sets = RULE_SETS.filter((r) => r.providerId === provider.providerId)
          .map((r) => ({
            ...r,
            accounts: catalog
              .accounts()
              .filter((a) => a.matchingRuleSetId === r.ruleSetId)
              .map((a) => ({ accountId: a.accountId, name: a.name, isActive: a.isActive }))
              .sort(byName),
          }))
          .sort(byName)
        return HttpResponse.json(sets.map((s) => MatchingRuleSetSummary.parse(s)))
      }),
    ),
  ]
}
