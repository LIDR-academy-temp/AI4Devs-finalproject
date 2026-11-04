// In-memory stand-in for the fee administration API of admin-fees (web-admin-fees design D8). Queries and bodies are
// checked with the schemas of @recon/shared (FeesQuery, AccountFeesQuery, FeeCreate, FeePatch, FeeHistoryQuery); permission is checked
// before scope, and anything outside the scope answers the same 404 as a missing id. The fake models what changes
// between requests: the fees a write creates or patches and their history rows. It does NOT decide business rules:
// overlaps, use and the limits of a closing are scripted by each test (respondNextFee). GET /accounts/{id}/fees and
// GET /fee-types are shared with Settlement Review, whose tests read them in the settlement request log: those two
// routes go through the settlement route wrapper under their old names.
import {
  AccountFeesQuery,
  FeeCreate,
  type FeeHistoryEntry,
  FeeHistoryQuery,
  type FeeListItem,
  FeePatch,
  type FeeSnapshot,
  FeesQuery,
} from '@recon/shared'
import { HttpResponse, http, type PathParams } from 'msw'
import type { AccountFee } from '@/features/settlements/contract'
import { businessDate } from '@/lib/format'
import {
  ACCOUNT_FEES,
  FEE_TYPE_VIEWS,
  FIXTURE_TODAY,
  feeFixture,
  feeStatus,
  feeTypeOf,
  TRANSACTIONAL_FEES,
} from './fee-fixtures'
import { ACCOUNT_IDS, ACCOUNTS, MERCHANTS, PROVIDERS, USERS, type UserName } from './fixtures'
import type { AccountName } from './import-fixtures'
import { respondNextSettlement, settlementRequests, route as settlementRoute } from './settlements'

export { feeFixture }

const API = '*/api/v1'

/** The routes of the fake; accountFees and feeTypes are logged with the settlement routes (see the header). */
export type FeeRoute = 'list' | 'accountFees' | 'feeTypes' | 'create' | 'patch' | 'history'

export interface FeeRequestLog {
  route: FeeRoute
  method: string
  url: string
  body: unknown
  status: number | null
}

export interface ScriptedFeeError {
  status: number
  code: string
  message?: string
  details?: unknown
}

function freshState() {
  return {
    /** Fees a test put in place of the fixtures of an account. */
    seeded: new Map<AccountName, AccountFee[]>(),
    /** Fees created by POST or as a successor, per account, in creation order. */
    added: new Map<AccountName, AccountFee[]>(),
    /** The current version of a fee a PATCH changed. */
    patched: new Map<string, AccountFee>(),
    /** History rows written by the fake, newest last. */
    history: [] as FeeHistoryEntry[],
    responses: new Map<FeeRoute, ScriptedFeeError[]>(),
    requests: [] as FeeRequestLog[],
    seq: 0,
    tick: 0,
  }
}

let state = freshState()

export function resetFees() {
  state = freshState()
}

// --- Test API -------------------------------------------------------------------------------------------------------

/** Replaces every fee of the account (transactional and not) with these, in this order. */
export function seedAccountFees(account: AccountName, fees: AccountFee[]) {
  state.seeded.set(account, fees)
}

/** The next request to `route` answers this error without changing anything. */
export function respondNextFee(route: FeeRoute, error: ScriptedFeeError) {
  if (route === 'accountFees' || route === 'feeTypes') {
    respondNextSettlement(route === 'accountFees' ? 'fees' : 'feeTypes', error)
    return
  }
  state.responses.set(route, [...(state.responses.get(route) ?? []), error])
}

/** The requests received by `route`, in order. */
export function feeRequests(route: FeeRoute): FeeRequestLog[] {
  if (route === 'accountFees' || route === 'feeTypes') {
    return settlementRequests(route === 'accountFees' ? 'fees' : 'feeTypes').map((r) => ({ ...r, route }))
  }
  return state.requests.filter((r) => r.route === route)
}

// --- Data -----------------------------------------------------------------------------------------------------------

const accountNameOf = (accountId: string) =>
  (Object.keys(ACCOUNT_IDS) as AccountName[]).find((name) => ACCOUNT_IDS[name] === accountId)

/** The fees of an account as the API holds them now: fixtures (read live) or seeded, patched, then the added. */
function feesOf(account: AccountName): AccountFee[] {
  const base = state.seeded.get(account) ?? [...TRANSACTIONAL_FEES[account], ...ACCOUNT_FEES[account]]
  return [...base, ...(state.added.get(account) ?? [])].map((fee) => state.patched.get(fee.feeId) ?? fee)
}

function findFee(feeId: string): { fee: AccountFee; account: AccountName } | null {
  for (const account of Object.keys(ACCOUNT_IDS) as AccountName[]) {
    const fee = feesOf(account).find((f) => f.feeId === feeId)
    if (fee) return { fee, account }
  }
  return null
}

const providerOf = (account: AccountName) =>
  PROVIDERS.find((p) => p.providerId === ACCOUNTS.find((a) => a.accountId === ACCOUNT_IDS[account])?.providerId)!

const visibleMerchants = (user: UserName) => USERS[user].merchants.map((m) => m.merchantId)
const canSeeAccount = (user: UserName, account: AccountName) =>
  visibleMerchants(user).includes(providerOf(account).merchantId)

function listItem(account: AccountName, fee: AccountFee): FeeListItem {
  const provider = providerOf(account)
  const merchant = MERCHANTS.find((m) => m.merchantId === provider.merchantId)!
  return {
    ...fee,
    merchant: { id: merchant.merchantId, name: merchant.name },
    provider: { id: provider.providerId, name: provider.name },
    account: { id: ACCOUNT_IDS[account], name: account },
  }
}

/** README §4.4 order of GET /fees: merchant, provider, account, type title, startDate (nulls first), feeId. */
function byApiOrder(a: FeeListItem, b: FeeListItem): number {
  const keys = (f: FeeListItem) => [
    f.merchant.name,
    f.provider.name,
    f.account.name,
    f.title,
    f.startDate ?? '',
    f.feeId,
  ]
  const [ka, kb] = [keys(a), keys(b)]
  for (let i = 0; i < ka.length; i++) {
    const order = ka[i]!.localeCompare(kb[i]!)
    if (order !== 0) return order
  }
  return 0
}

/** "15" → "15.0000", "0.0275" → "0.027500": the API answers Money4 and Rate6. */
function fixed(value: string | null | undefined, decimals: number): string | null {
  if (value === null || value === undefined) return null
  const [integer = '0', fraction = ''] = value.split('.')
  return `${integer}.${fraction.padEnd(decimals, '0')}`
}

/** The civil day before, without a time zone. */
function previousDay(day: string): string {
  const date = new Date(`${day}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

function snapshot(fee: AccountFee): FeeSnapshot {
  return {
    feeTypeId: fee.feeTypeId,
    fixedAmount: fee.fixedAmount,
    percentage: fee.percentage,
    conditionalPercentage: fee.conditionalPercentage,
    conditionThresholdAmt: fee.conditionThresholdAmt,
    brandFixedAmount: fee.brandFixedAmount,
    brandPercentage: fee.brandPercentage,
    startDate: fee.startDate,
    endDate: fee.endDate,
    description: fee.description,
  }
}

const userRef = (user: UserName) => ({ userId: USERS[user].userId, userName: USERS[user].userName })

function nextInstant(): string {
  state.tick += 1
  return new Date(Date.UTC(2026, 10, 3, 15, 0, state.tick)).toISOString()
}

function nextFeeId(): string {
  state.seq += 1
  return `f1000000-0000-4000-8000-${String(state.seq).padStart(12, '0')}`
}

function writeHistory(
  fee: AccountFee,
  action: FeeHistoryEntry['action'],
  user: UserName,
  before: AccountFee | null,
  reason?: string,
) {
  state.history.push({
    feeHistoryId: 1000 + state.history.length,
    feeId: fee.feeId,
    action,
    changedAt: nextInstant(),
    changedBy: userRef(user),
    reason: reason ?? null,
    before: before ? snapshot(before) : null,
    after: snapshot(fee),
  })
}

/** History of a fee, newest first: the rows the fake wrote, then the created row of the seed for a seeded fee. */
function historyOf(feeIds: string[], account: AccountName): FeeHistoryEntry[] {
  const written = state.history.filter((h) => feeIds.includes(h.feeId)).reverse()
  const added = new Set((state.added.get(account) ?? []).map((f) => f.feeId))
  const seed = feeIds
    .filter((id) => !added.has(id))
    .map((id, index) => {
      const original = [
        ...(state.seeded.get(account) ?? []),
        ...TRANSACTIONAL_FEES[account],
        ...ACCOUNT_FEES[account],
      ].find((f) => f.feeId === id)!
      return {
        feeHistoryId: 1 + index,
        feeId: id,
        action: 'created' as const,
        changedAt: original.createdAt,
        changedBy: original.createdBy,
        reason: 'seed',
        before: null,
        after: snapshot(original),
      }
    })
  return [...written, ...seed]
}

// --- HTTP ------------------------------------------------------------------------------------------------------------

const error = (status: number, code: string, message: string, details?: unknown) =>
  HttpResponse.json({ code, message, ...(details === undefined ? {} : { details }) }, { status })
const notFound = (entity: string) => error(404, 'not_found', `${entity} not found`)
const forbidden = () => error(403, 'forbidden', 'Forbidden')
const can = (user: UserName, permission: 'fee.view' | 'fee.manage') => USERS[user].permissions.includes(permission)

function invalid(issues: { path: PropertyKey[]; message: string }[]) {
  return error(
    400,
    'validation_error',
    'Invalid request',
    issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  )
}

interface RouteArgs {
  request: Request
  params: PathParams
  user: UserName
  body: unknown
}

/** A route of the fake: logs the request and honours the scripted answers of the tests. */
function feeRoute(
  name: FeeRoute,
  resolve: (args: RouteArgs) => Response,
  caller: (request: Request) => UserName | null,
) {
  return async ({ request, params }: { request: Request; params: PathParams }) => {
    const url = new URL(request.url)
    const body = request.headers.get('content-type')?.includes('json') ? await request.clone().json() : undefined
    const log: FeeRequestLog = {
      route: name,
      method: request.method,
      url: url.pathname + url.search,
      body,
      status: null,
    }
    state.requests.push(log)
    const user = caller(request)
    if (!user) {
      log.status = 401
      return error(401, 'unauthorized', 'Unauthorized')
    }
    const scripted = state.responses.get(name)?.shift()
    const answer = scripted
      ? error(scripted.status, scripted.code, scripted.message ?? scripted.code, scripted.details)
      : resolve({ request, params, user, body })
    log.status = answer.status
    return answer
  }
}

function listFees(user: UserName, searchParams: URLSearchParams): Response {
  if (!can(user, 'fee.view')) return forbidden()
  const parsed = FeesQuery.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) return invalid(parsed.error.issues)
  const query = parsed.data
  const merchants = visibleMerchants(user)
  if (query.merchantId !== undefined && !merchants.includes(query.merchantId)) return notFound('Merchant')
  if (query.providerId !== undefined) {
    const provider = PROVIDERS.find((p) => p.providerId === query.providerId)
    if (!provider || !merchants.includes(provider.merchantId)) return notFound('Provider')
  }
  if (query.accountId !== undefined) {
    const name = accountNameOf(query.accountId)
    if (!name || !canSeeAccount(user, name)) return notFound('Account')
  }
  const needle = query.q?.toLowerCase()
  const items = (Object.keys(ACCOUNT_IDS) as AccountName[])
    .filter((account) => canSeeAccount(user, account))
    .flatMap((account) => feesOf(account).map((fee) => listItem(account, fee)))
    .filter((f) => query.merchantId === undefined || f.merchant.id === query.merchantId)
    .filter((f) => query.providerId === undefined || f.provider.id === query.providerId)
    .filter((f) => query.accountId === undefined || f.account.id === query.accountId)
    .filter((f) => query.status === undefined || f.status === query.status)
    .filter((f) => {
      if (query.kind === undefined) return true
      const type = feeTypeOf(f.feeTypeId)!
      if (query.kind === 'transactional') return type.isTransactional
      return !type.isTransactional && type.allowsFreeAmount === (query.kind === 'free_amount')
    })
    .filter(
      (f) =>
        needle === undefined ||
        [f.account.name, f.code, f.title, f.description ?? ''].some((text) => text.toLowerCase().includes(needle)),
    )
    .sort(byApiOrder)
  const start = (query.page - 1) * query.pageSize
  return HttpResponse.json({
    items: items.slice(start, start + query.pageSize),
    page: query.page,
    pageSize: query.pageSize,
    total: items.length,
  })
}

function createFee(user: UserName, accountId: string, body: unknown): Response {
  if (!can(user, 'fee.manage')) return forbidden()
  const account = accountNameOf(accountId)
  if (!account || !canSeeAccount(user, account)) return notFound('Account')
  const parsed = FeeCreate.safeParse(body)
  if (!parsed.success) return invalid(parsed.error.issues)
  const input = parsed.data
  const type = feeTypeOf(input.feeTypeId)
  if (!type) return error(400, 'validation_error', 'Fee type not active', { field: 'feeTypeId' })
  const now = nextInstant()
  const fee: AccountFee = {
    ...feeFixture({ feeTypeId: input.feeTypeId }),
    feeId: nextFeeId(),
    fixedAmount: fixed(input.fixedAmount, 4),
    percentage: fixed(input.percentage, 6),
    startDate: input.startDate === null ? null : businessDate(input.startDate),
    endDate: input.endDate === null ? null : businessDate(input.endDate),
    description: input.description ?? null,
    status: feeStatus(input.startDate, input.endDate, FIXTURE_TODAY),
    inUse: false,
    lastAppliedEventDate: null,
    createdBy: userRef(user),
    createdAt: now,
    updatedAt: now,
  }
  state.added.set(account, [...(state.added.get(account) ?? []), fee])
  writeHistory(fee, 'created', user, null)
  return HttpResponse.json(fee, { status: 201 })
}

const VALUE_KEYS = ['fixedAmount', 'percentage', 'description'] as const

/** Applies the values of a body to a fee: amounts as Money4, rates as Rate6, dates branded. */
function withValues(fee: AccountFee, body: Record<string, unknown>): AccountFee {
  const next = { ...fee }
  if ('fixedAmount' in body) next.fixedAmount = fixed(body.fixedAmount as string | null, 4)
  if ('percentage' in body) next.percentage = fixed(body.percentage as string | null, 6)
  if ('description' in body) next.description = (body.description as string | null) ?? null
  if ('startDate' in body) next.startDate = body.startDate === null ? null : businessDate(body.startDate as string)
  if ('endDate' in body) next.endDate = body.endDate === null ? null : businessDate(body.endDate as string)
  next.status = feeStatus(next.startDate, next.endDate, FIXTURE_TODAY)
  next.updatedAt = nextInstant()
  return next
}

function patchFee(user: UserName, feeId: string, body: unknown): Response {
  if (!can(user, 'fee.manage')) return forbidden()
  const found = findFee(feeId)
  if (!found || !canSeeAccount(user, found.account)) return notFound('Fee')
  const parsed = FeePatch.safeParse(body)
  if (!parsed.success) return invalid(parsed.error.issues)
  const input = parsed.data as Record<string, unknown>
  const reason = input.reason as string | undefined
  const { fee, account } = found

  if (typeof input.effectiveFrom === 'string') {
    const closed = withValues(fee, { endDate: previousDay(input.effectiveFrom) })
    const values = Object.fromEntries(VALUE_KEYS.filter((k) => k in input).map((k) => [k, input[k]]))
    const now = nextInstant()
    const successor: AccountFee = {
      ...withValues(fee, { ...values, startDate: input.effectiveFrom, endDate: fee.endDate }),
      feeId: nextFeeId(),
      inUse: false,
      lastAppliedEventDate: null,
      createdBy: userRef(user),
      createdAt: now,
      updatedAt: now,
    }
    state.patched.set(fee.feeId, closed)
    state.added.set(account, [...(state.added.get(account) ?? []), successor])
    writeHistory(closed, 'closed', user, fee, reason)
    writeHistory(successor, 'created', user, null, reason)
    return HttpResponse.json({ fee: closed, successor })
  }

  const { reason: _reason, ...changes } = input
  const next = withValues(fee, changes)
  // The action of the history row, a deliberate simplification of the fake: `closed` when the body only gives an end
  // to an open fee, `updated` for anything else. Enough for the screens, which only show the action the API sends;
  // which action the real API writes is decided and tested in admin-fees.
  const onlyCloses = Object.keys(changes).length === 1 && 'endDate' in changes && fee.endDate === null
  state.patched.set(fee.feeId, next)
  writeHistory(next, onlyCloses && next.endDate !== null ? 'closed' : 'updated', user, fee, reason)
  return HttpResponse.json({ fee: next, successor: null })
}

function feeHistory(user: UserName, feeId: string, searchParams: URLSearchParams): Response {
  if (!can(user, 'fee.view')) return forbidden()
  const parsed = FeeHistoryQuery.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) return invalid(parsed.error.issues)
  const found = findFee(feeId)
  if (!found || !canSeeAccount(user, found.account)) return notFound('Fee')
  const ids =
    parsed.data.scope === 'type'
      ? feesOf(found.account)
          .filter((f) => f.feeTypeId === found.fee.feeTypeId)
          .map((f) => f.feeId)
      : [feeId]
  const rows = historyOf(ids, found.account).sort((a, b) => b.changedAt.localeCompare(a.changedAt))
  return HttpResponse.json(rows)
}

function accountFees(user: UserName, accountId: string, searchParams: URLSearchParams): Response {
  if (!can(user, 'fee.view')) return forbidden()
  const account = accountNameOf(accountId)
  if (!account || !canSeeAccount(user, account)) return notFound('Account')
  const parsed = AccountFeesQuery.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) return invalid(parsed.error.issues)
  const { transactional, asOf } = parsed.data
  // asOf: in force on that business day, both ends included (null = since forever / no end).
  const inForce = (f: AccountFee) =>
    asOf === undefined || ((f.startDate === null || f.startDate <= asOf) && (f.endDate === null || f.endDate >= asOf))
  const fees = feesOf(account).filter(
    (f) => (transactional === undefined || f.isTransactional === transactional) && inForce(f),
  )
  return HttpResponse.json(fees)
}

export function createFeeHandlers(caller: (request: Request) => UserName | null) {
  return [
    http.get(
      `${API}/fees`,
      feeRoute('list', ({ request, user }) => listFees(user, new URL(request.url).searchParams), caller),
    ),
    http.get(
      `${API}/fees/:feeId/history`,
      feeRoute(
        'history',
        ({ request, params, user }) => feeHistory(user, String(params.feeId), new URL(request.url).searchParams),
        caller,
      ),
    ),
    http.patch(
      `${API}/fees/:feeId`,
      feeRoute('patch', ({ params, user, body }) => patchFee(user, String(params.feeId), body), caller),
    ),
    http.post(
      `${API}/accounts/:accountId/fees`,
      feeRoute('create', ({ params, user, body }) => createFee(user, String(params.accountId), body), caller),
    ),
    http.get(
      `${API}/accounts/:accountId/fees`,
      settlementRoute(
        'fees',
        ({ request, params, user }) => accountFees(user, String(params.accountId), new URL(request.url).searchParams),
        caller,
      ),
    ),
    http.get(
      `${API}/fee-types`,
      settlementRoute('feeTypes', () => HttpResponse.json(FEE_TYPE_VIEWS), caller),
    ),
  ]
}
