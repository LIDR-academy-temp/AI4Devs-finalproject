// In-memory stand-in for the API (openspec/specs/auth, openspec/specs/accounts): token rotation, merchant scope
// and 404 for anything outside the scope, so the screens are tested against the real rules.
import { HttpResponse, http, type PathParams } from 'msw'
import {
  ACCOUNT_CHANNELS,
  ACCOUNTS,
  type AccountChannelRow,
  CHANNELS,
  CHANNELS_WITH_TRANSACTIONS,
  INACTIVE_USER,
  MERCHANTS,
  PASSWORD,
  PROVIDERS,
  toAccountChannelItem,
  USERS,
  type UserName,
} from './fixtures'
import { createImportHandlers, resetImports } from './imports'
import { createSettlementHandlers, resetSettlements } from './settlements'
import { createValidationHandlers, resetValidations } from './validations'

const API = '*/api/v1'

function freshDb() {
  return {
    accessTokens: new Map<string, UserName>(),
    refreshTokens: new Map<string, UserName>(),
    providers: [...PROVIDERS],
    accounts: [...ACCOUNTS],
    accountChannels: [...ACCOUNT_CHANNELS] as AccountChannelRow[],
    /** Every refresh token received by POST /auth/refresh, in order, and whether it was still valid. */
    refreshLog: [] as { refreshToken: string; valid: boolean }[],
    seq: 0,
  }
}

/** Mutable state of the fake API; reset after every test. */
export let db = freshDb()

export function resetDb() {
  db = freshDb()
  resetImports()
  resetValidations()
  resetSettlements()
}

/** Issues a token pair for a user, as a successful login would. */
export function issueTokens(userName: UserName) {
  db.seq += 1
  const accessToken = `access-${userName}-${db.seq}`
  const refreshToken = `refresh-${userName}-${db.seq}`
  db.accessTokens.set(accessToken, userName)
  db.refreshTokens.set(refreshToken, userName)
  return { accessToken, refreshToken, expiresIn: 900 }
}

const error = (status: number, code: string, message: string) => HttpResponse.json({ code, message }, { status })
const notFound = (entity: string) => error(404, 'not_found', `${entity} not found`)

function caller(request: Request): UserName | null {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '')
  return (token && db.accessTokens.get(token)) || null
}

function visibleMerchantIds(userName: UserName): number[] {
  return USERS[userName].merchants.map((m) => m.merchantId)
}

function visibleProvider(userName: UserName, providerId: number) {
  return db.providers.find((p) => p.providerId === providerId && visibleMerchantIds(userName).includes(p.merchantId))
}

/** Wraps a protected route: 401 without a valid access token. */
function protectedRoute(
  resolve: (args: { request: Request; params: PathParams; user: UserName }) => Response | Promise<Response>,
) {
  return ({ request, params }: { request: Request; params: PathParams }) => {
    const user = caller(request)
    if (!user) return error(401, 'unauthorized', 'Unauthorized')
    return resolve({ request, params, user })
  }
}

export const handlers = [
  http.post(`${API}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { userName: string; password: string }
    const known = body.userName in USERS && body.userName !== INACTIVE_USER
    if (!known || body.password !== PASSWORD) {
      return error(401, 'invalid_credentials', 'Invalid user name or password')
    }
    return HttpResponse.json(issueTokens(body.userName as UserName))
  }),

  http.post(`${API}/auth/refresh`, async ({ request }) => {
    const { refreshToken } = (await request.json()) as { refreshToken: string }
    const user = db.refreshTokens.get(refreshToken)
    db.refreshLog.push({ refreshToken, valid: user !== undefined })
    if (!user) return error(401, 'invalid_token', 'Invalid or expired token')
    db.refreshTokens.delete(refreshToken)
    return HttpResponse.json(issueTokens(user))
  }),

  http.post(`${API}/auth/logout`, async ({ request }) => {
    const { refreshToken } = (await request.json()) as { refreshToken: string }
    db.refreshTokens.delete(refreshToken)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(
    `${API}/auth/me`,
    protectedRoute(({ user }) => HttpResponse.json(USERS[user])),
  ),

  http.get(
    `${API}/merchants`,
    protectedRoute(({ user }) =>
      HttpResponse.json(MERCHANTS.filter((m) => visibleMerchantIds(user).includes(m.merchantId))),
    ),
  ),

  http.get(
    `${API}/merchants/:merchantId/providers`,
    protectedRoute(({ user, params }) => {
      const merchantId = Number(params.merchantId)
      if (!visibleMerchantIds(user).includes(merchantId)) return notFound('Merchant')
      return HttpResponse.json(db.providers.filter((p) => p.merchantId === merchantId))
    }),
  ),

  http.get(
    `${API}/providers/:providerId`,
    protectedRoute(({ user, params }) => {
      const provider = visibleProvider(user, Number(params.providerId))
      if (!provider) return notFound('Provider')
      const merchant = MERCHANTS.find((m) => m.merchantId === provider.merchantId)!
      return HttpResponse.json({
        ...provider,
        merchant: { merchantId: merchant.merchantId, name: merchant.name },
        accounts: db.accounts
          .filter((a) => a.providerId === provider.providerId)
          .sort((a, b) => a.name.localeCompare(b.name)),
        channels: CHANNELS.filter((c) => c.providerId === provider.providerId),
      })
    }),
  ),

  http.get(
    `${API}/accounts/:accountId`,
    protectedRoute(({ user, params }) => {
      const acc = db.accounts.find((a) => a.accountId === params.accountId)
      const provider = acc && visibleProvider(user, acc.providerId)
      if (!acc || !provider) return notFound('Account')
      const merchant = MERCHANTS.find((m) => m.merchantId === provider.merchantId)!
      return HttpResponse.json({
        ...acc,
        provider,
        merchant: { merchantId: merchant.merchantId, name: merchant.name },
      })
    }),
  ),

  http.get(
    `${API}/accounts/:accountId/channels`,
    protectedRoute(({ user, params }) => {
      const acc = db.accounts.find((a) => a.accountId === params.accountId)
      if (!acc || !visibleProvider(user, acc.providerId)) return notFound('Account')
      const rows = db.accountChannels.filter((r) => r.accountId === acc.accountId)
      return HttpResponse.json(rows.map((r) => toAccountChannelItem(r, db.accountChannels)))
    }),
  ),

  http.get(
    `${API}/channels`,
    protectedRoute(({ user, request }) => {
      const unassigned = new URL(request.url).searchParams.get('unassigned') === 'true'
      const visible = CHANNELS.filter((c) => visibleProvider(user, c.providerId))
      return HttpResponse.json(
        unassigned
          ? visible.filter(
              (c) =>
                CHANNELS_WITH_TRANSACTIONS.has(c.channelId) &&
                !db.accountChannels.some((r) => r.channelId === c.channelId),
            )
          : visible,
      )
    }),
  ),

  ...createImportHandlers(caller),
  ...createValidationHandlers(caller),
  ...createSettlementHandlers(caller),
]
