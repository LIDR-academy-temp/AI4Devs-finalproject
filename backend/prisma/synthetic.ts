/**
 * Recon Tool 2.0 — deterministic synthetic world.
 *
 * Generates catalogs, accounts, transactions and batch history from a fixed seed,
 * so that the database seed and the sample files (data/samples) match exactly
 * across runs. Its only dependency is Prisma's Decimal (decimal.js), for the amounts
 * the system computes.
 *
 * Parameters taken from the v1 profile (doc 06): ~30 % declined, 1.5 % chargebacks,
 * 1 % refunds, median ticket ~100 USD with a long tail, brands 60/30/7/3, 10 % reserve
 * for 180 days, 10-day E window, settlement ~17 days after the window closes.
 *
 * Amounts: tickets and the amounts written in the provider's files are inputs in cents
 * (`money`). Fees, reserves and totals are computed with 4 decimals, rounding half up in
 * the fourth only when a product has more (`amount4`; gate of settlement-process).
 *
 * All IDs are made up: 15 digits for the numeric gateway, UUID v4 for the UUID
 * gateway. No value comes from real data.
 */
import { Decimal } from '@prisma/client/runtime/client'
import type { RoleName } from '@recon/shared'

// Re-exported for data/samples/plan.ts, which lives outside the backend package and cannot resolve @prisma/client.
export { Decimal }

export const ANCHOR = new Date(Date.UTC(2026, 9, 12)) // 2026-10-12, the dataset's fixed "today"

// ───────────────────────── PRNG ─────────────────────────

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Rng = () => number

const _pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)]!
const between = (rng: Rng, a: number, b: number) => a + Math.floor(rng() * (b - a + 1))
export const day = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000)
export const iso = (d: Date) => d.toISOString().slice(0, 10)
/** Inputs in cents: generated tickets and the amounts the provider writes in its files. */
export const money = (n: number) => Math.round(n * 100) / 100
/** A computed amount: 4 decimals, half up in the fourth (DECIMAL(19,4)). */
export const amount4 = (value: Decimal.Value) => new Decimal(value).toDecimalPlaces(4, Decimal.ROUND_HALF_UP)
/** DECIMAL(19,4) text, as money travels in the API. */
export const text4 = (value: Decimal.Value) => new Decimal(value).toFixed(4)
/** Reserve of a transaction: amount × applied percentage, 4 decimals. */
export const reserveOf = (t: Pick<Txn, 'amount' | 'appliedReservePct'>) =>
  amount4(new Decimal(t.amount).times(t.appliedReservePct))

/** Log-normal ticket: median ~100, mean ~139, tail up to ~1500. */
function ticket(rng: Rng) {
  const u = Math.max(rng(), 1e-9)
  const v = rng()
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  return money(Math.min(1500, Math.max(5, Math.exp(4.6 + 0.75 * z))))
}

function brand(rng: Rng) {
  const r = rng()
  return r < 0.6 ? 'Visa' : r < 0.9 ? 'Mastercard' : r < 0.97 ? 'Amex' : 'Discover'
}

/** 15-digit numeric ID, no leading zero. */
function numericId(rng: Rng) {
  let s = String(between(rng, 1, 9))
  while (s.length < 15) s += String(Math.floor(rng() * 10))
  return s
}

function uuidV4(rng: Rng) {
  const h = '0123456789abcdef'
  let s = ''
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) s += '-'
    else if (i === 14) s += '4'
    else if (i === 19) s += h[8 + Math.floor(rng() * 4)]
    else s += h[Math.floor(rng() * 16)]
  }
  return s
}

/** Deterministic UUID v4 for app keys (accountId, batchId…). */
export const uid = (rng: Rng) => uuidV4(rng)

// ───────────────────────── Catalogs ─────────────────────────

export const CYCLES = [
  { cycle: 'E', name: 'Transaction' },
  { cycle: 'I', name: 'Adjustment' },
  { cycle: 'R', name: 'Rolling reserve' },
] as const

export const STATUS = {
  Pending: 1,
  Successful: 2,
  Declined: 3,
  Chargeback: 4,
  Refund: 5,
  RDR: 6,
} as const
export type StatusCode = keyof typeof STATUS

export const TRANSACTION_STATUSES = [
  { statusId: 1, code: 'Pending', name: 'Pending', cycle: 'E' },
  { statusId: 2, code: 'Successful', name: 'Successful', cycle: 'E' },
  { statusId: 3, code: 'Declined', name: 'Declined', cycle: 'E' },
  { statusId: 4, code: 'Chargeback', name: 'Chargeback', cycle: 'I' },
  { statusId: 5, code: 'Refund', name: 'Refund', cycle: 'I' },
  { statusId: 6, code: 'RDR', name: 'RDR', cycle: 'I' },
] as const

export const SETTLEMENT_STATUSES = [
  { settlementStatusId: 0, name: 'Unsettled' },
  { settlementStatusId: 1, name: 'Settled' },
  { settlementStatusId: 2, name: 'Disputed' },
] as const

/** Transactional (1–6) and the 21 non-transactional ones from the template's Settings sheet (101–121). */
export const FEE_TYPES = [
  {
    feeTypeId: 1,
    code: 'MDR',
    title: 'MDR',
    isTransactional: true,
    appliesToStatusId: STATUS.Successful,
    allowsFreeAmount: false,
  },
  {
    feeTypeId: 2,
    code: 'TRX Fee - Deposit',
    title: 'Deposit per txn fee',
    isTransactional: true,
    appliesToStatusId: STATUS.Successful,
    allowsFreeAmount: false,
  },
  {
    feeTypeId: 3,
    code: 'TRX Fee - Decline',
    title: 'Decline fee',
    isTransactional: true,
    appliesToStatusId: STATUS.Declined,
    allowsFreeAmount: false,
  },
  {
    feeTypeId: 4,
    code: 'Chargeback',
    title: 'Chargeback per txn fee',
    isTransactional: true,
    appliesToStatusId: STATUS.Chargeback,
    allowsFreeAmount: false,
  },
  {
    feeTypeId: 5,
    code: 'Refund',
    title: 'Refund per txn fee',
    isTransactional: true,
    appliesToStatusId: STATUS.Refund,
    allowsFreeAmount: false,
  },
  {
    feeTypeId: 6,
    code: 'RDR',
    title: 'RDR per txn fee',
    isTransactional: true,
    appliesToStatusId: STATUS.RDR,
    allowsFreeAmount: false,
  },
  ...[
    ['Annual Fee', false],
    ['Bram Fine', true],
    ['Chargeback Assessment Fee', false],
    ['Chargeback Order Deduction', false],
    ['Chargeback over 1%', true],
    ['Chargeback over 2%', true],
    ['Chargeback over 3%', true],
    ['Chargeback Reversed', true],
    ['Cross Border Fee', false],
    ['Customer Service Fee', false],
    ['Monthly Fee', false],
    ['Rebate 2%', true],
    ['Rebate 3%', true],
    ['Release of Frozen Funds', true],
    ['Remittance Charges', false],
    ['Service Fee', false],
    ['Settlement Fee', false],
    ['Setup Fee', false],
    ['Special Adjustment', true],
    ['Special Deduction', true],
    ['Wire Fee', false],
  ].map(([code, free], i) => ({
    feeTypeId: 101 + i,
    code: code as string,
    title: code as string,
    isTransactional: false,
    appliesToStatusId: null as number | null,
    allowsFreeAmount: free as boolean,
  })),
]

/** Demo users; roles and their permissions come from `ROLES` in @recon/shared. */
export const USERS = [
  {
    userName: 'admin',
    email: 'admin@recon.local',
    displayName: 'Admin',
    role: 'admin',
    merchantScope: 'all',
    merchants: [] as number[],
  },
  {
    userName: 'analyst',
    email: 'analyst@recon.local',
    displayName: 'Analyst',
    role: 'analyst',
    merchantScope: 'assigned',
    merchants: [1, 2],
  },
  {
    userName: 'payments',
    email: 'payments@recon.local',
    displayName: 'Payments',
    role: 'payments',
    merchantScope: 'assigned',
    merchants: [1, 2],
  },
  {
    userName: 'viewer',
    email: 'viewer@recon.local',
    displayName: 'Viewer',
    role: 'viewer',
    merchantScope: 'assigned',
    merchants: [1],
  },
] as const satisfies readonly {
  userName: string
  email: string
  displayName: string
  role: RoleName
  merchantScope: 'assigned' | 'all'
  merchants: readonly number[]
}[]

export const GATEWAYS = [
  { gatewayId: 1, name: 'Gateway Numeric', idFormat: 'numeric' },
  { gatewayId: 2, name: 'Gateway UUID', idFormat: 'uuid' },
] as const

export const MERCHANTS = [
  { merchantId: 1, name: 'Merchant A' },
  { merchantId: 2, name: 'Merchant B' },
] as const

export const PROVIDERS = [
  { providerId: 101, merchantId: 1, name: 'Provider A' },
  { providerId: 102, merchantId: 1, name: 'Provider B' },
  { providerId: 201, merchantId: 2, name: 'Provider C' },
] as const

/** Channels (RAM). "account" = primary account in the seed; null = not assigned yet. */
export const CHANNELS = [
  {
    channelId: 1001,
    gatewayId: 1,
    providerId: 101,
    name: 'RAM-01',
    account: 'ProviderA-USD',
    term: 14,
    pct: 0.1,
    days: 180,
  },
  {
    channelId: 1002,
    gatewayId: 1,
    providerId: 101,
    name: 'RAM-02',
    account: 'ProviderA-USD',
    term: 14,
    pct: 0.1,
    days: 180,
  },
  {
    channelId: 1003,
    gatewayId: 1,
    providerId: 101,
    name: 'RAM-03',
    account: 'ProviderA-EUR',
    term: 14,
    pct: 0.1,
    days: 180,
  },
  { channelId: 1007, gatewayId: 1, providerId: 101, name: 'RAM-07', account: null, term: 14, pct: 0.1, days: 180 },
  {
    channelId: 1011,
    gatewayId: 1,
    providerId: 102,
    name: 'RAM-11',
    account: 'ProviderB-Main',
    term: 10,
    pct: 0.1,
    days: 180,
  },
  {
    channelId: 1012,
    gatewayId: 1,
    providerId: 102,
    name: 'RAM-12',
    account: 'ProviderB-Main',
    term: 10,
    pct: 0.1,
    days: 180,
  },
  { channelId: 1013, gatewayId: 1, providerId: 102, name: 'RAM-13', account: null, term: 10, pct: 0.05, days: 120 },
  {
    channelId: 2001,
    gatewayId: 2,
    providerId: 201,
    name: 'RAM-U1',
    account: 'ProviderC-USD',
    term: 7,
    pct: 0.0,
    days: 0,
  },
  {
    channelId: 2002,
    gatewayId: 2,
    providerId: 201,
    name: 'RAM-U2',
    account: 'ProviderC-Alt',
    term: 7,
    pct: 0.05,
    days: 180,
  },
] as const

export const ACCOUNTS = [
  {
    name: 'ProviderA-USD',
    providerId: 101,
    policy: 'hold_until_term',
    cap: null,
    ruleSet: null,
    batchStart: 101,
    firstBatchDate: '2026-03-01',
  },
  {
    name: 'ProviderA-EUR',
    providerId: 101,
    policy: 'hold_until_term',
    cap: 50_000,
    ruleSet: null,
    batchStart: 1,
    firstBatchDate: '2026-06-01',
  },
  {
    name: 'ProviderB-Main',
    providerId: 102,
    policy: 'release_on_chargeback',
    cap: null,
    ruleSet: null,
    batchStart: 30,
    firstBatchDate: '2026-03-01',
  },
  {
    name: 'ProviderC-USD',
    providerId: 201,
    policy: 'hold_until_term',
    cap: null,
    ruleSet: null,
    batchStart: 1,
    firstBatchDate: '2026-08-01',
  },
  {
    name: 'ProviderC-Alt',
    providerId: 201,
    policy: 'hold_until_term',
    cap: null,
    ruleSet: 'Provider C legacy',
    batchStart: 1,
    firstBatchDate: '2026-08-01',
  },
] as const

/** Fees per account (validity NULL…NULL): the five transactional ones from v1 + Chargeback over 1 %. */
export const ACCOUNT_FEES: Record<
  string,
  { feeTypeId: number; fixed?: number; pct?: number; condPct?: number; threshold?: number }[]
> = {
  'ProviderA-USD': [
    { feeTypeId: 1, pct: 0.1 },
    { feeTypeId: 2, fixed: 0.65 },
    { feeTypeId: 3, fixed: 0.25 },
    { feeTypeId: 4, fixed: 45 },
    { feeTypeId: 5, fixed: 5 },
    { feeTypeId: 6, fixed: 25 },
    { feeTypeId: 105, pct: 0.01, condPct: 0.02, threshold: 0.01 },
  ],
  'ProviderA-EUR': [
    { feeTypeId: 1, pct: 0.105 },
    { feeTypeId: 2, fixed: 0.75 },
    { feeTypeId: 3, fixed: 0.25 },
    { feeTypeId: 4, fixed: 50 },
    { feeTypeId: 5, fixed: 5 },
    { feeTypeId: 105, pct: 0.01 },
  ],
  'ProviderB-Main': [
    { feeTypeId: 1, pct: 0.095 },
    { feeTypeId: 2, fixed: 0.5 },
    { feeTypeId: 3, fixed: 0.2 },
    { feeTypeId: 4, fixed: 35 },
    { feeTypeId: 5, fixed: 3.5 },
    { feeTypeId: 111, fixed: 250 },
  ],
  'ProviderC-USD': [
    { feeTypeId: 1, pct: 0.085 },
    { feeTypeId: 2, fixed: 0.5 },
    { feeTypeId: 3, fixed: 0.2 },
    { feeTypeId: 4, fixed: 40 },
    { feeTypeId: 5, fixed: 4 },
  ],
  // Only a Chargeback fee: the legacy sample checks that a CHB 2 gets the Chargeback fee (settlement-process).
  'ProviderC-Alt': [{ feeTypeId: 4, fixed: 40 }],
}

/** Global rules (ruleSetId NULL) derived from the standardized template. */
export const GLOBAL_SHEET_RULES = [
  { sheetPattern: 'APP', kind: 'transactions', cycle: 'E', statusId: STATUS.Successful, priority: 10 },
  { sheetPattern: 'DEC', kind: 'transactions', cycle: 'E', statusId: STATUS.Declined, priority: 10 },
  { sheetPattern: 'CHB', kind: 'transactions', cycle: 'I', statusId: STATUS.Chargeback, priority: 10 },
  { sheetPattern: 'REF', kind: 'transactions', cycle: 'I', statusId: STATUS.Refund, priority: 10 },
  { sheetPattern: 'RDR', kind: 'transactions', cycle: 'I', statusId: STATUS.RDR, priority: 10 },
  { sheetPattern: 'RR', kind: 'transactions', cycle: 'R', statusId: null, priority: 10 },
  { sheetPattern: 'Other Fees', kind: 'batch_fees', cycle: null, statusId: null, priority: 10 },
  { sheetPattern: 'Duplicate Corrections', kind: 'ignore', cycle: null, statusId: null, priority: 10 },
  { sheetPattern: 'CHB Alerts', kind: 'ignore', cycle: null, statusId: null, priority: 10 },
  { sheetPattern: 'Settings', kind: 'ignore', cycle: null, statusId: null, priority: 10 },
] as const

/** Column synonyms seen in v1 (MatchingColumns) + those from the template. */
export const GLOBAL_COLUMN_RULES = [
  { columnPattern: 'ID', targetField: 'transactionId', priority: 10 },
  { columnPattern: 'Amount', targetField: 'amount', priority: 10 },
  { columnPattern: 'Currency', targetField: 'currency', priority: 10 },
  { columnPattern: 'Type of Fee', targetField: 'feeType', priority: 10 },
  { columnPattern: 'Merchant Transaction No#', targetField: 'transactionId', priority: 50 },
  { columnPattern: 'Merchant Transaction No.', targetField: 'transactionId', priority: 50 },
  { columnPattern: 'Merchant Transaction ID', targetField: 'transactionId', priority: 50 },
  { columnPattern: 'Merchant Order No#', targetField: 'transactionId', priority: 50 },
  { columnPattern: 'Merchant Order #', targetField: 'transactionId', priority: 50 },
  { columnPattern: 'Merchant TXN ID', targetField: 'transactionId', priority: 50 },
  { columnPattern: 'ORDERMERCHANTID', targetField: 'transactionId', priority: 50 },
  { columnPattern: 'Transaction ID', targetField: 'transactionId', priority: 50 },
  { columnPattern: 'Status', targetField: 'status', priority: 50 },
  { columnPattern: 'Order Status', targetField: 'status', priority: 50 },
  { columnPattern: 'Gateway', targetField: 'gateway', priority: 50 },
  { columnPattern: 'Order ID', targetField: 'orderId', priority: 50 },
  { columnPattern: 'Transaction NO#', targetField: 'providerRef', priority: 50 },
  { columnPattern: 'Date', targetField: 'txnDate', priority: 60 },
] as const

export const GLOBAL_ROW_IGNORES = [
  {
    pattern: 'transactionId:empty',
    isRegex: false,
    description: 'Total rows (=SUM) and blank rows: no ID, no row',
  },
] as const

/** Global status aliases (v1 MatchingTransactionStatus + template). */
export const STATUS_ALIASES = [
  ['Successful', STATUS.Successful],
  ['Success', STATUS.Successful],
  ['Approved', STATUS.Successful],
  ['SUC', STATUS.Successful],
  ['APP', STATUS.Successful],
  ['Declined', STATUS.Declined],
  ['Decline', STATUS.Declined],
  ['DEC', STATUS.Declined],
  ['Fail', STATUS.Declined],
  ['Failed', STATUS.Declined],
  ['FAI', STATUS.Declined],
  ['Chargeback', STATUS.Chargeback],
  ['CHB', STATUS.Chargeback],
  ['CB', STATUS.Chargeback],
  ['Refund', STATUS.Refund],
  ['Refunded', STATUS.Refund],
  ['REF', STATUS.Refund],
  ['RDR', STATUS.RDR],
  ['(RDR)', STATUS.RDR],
  ['Pending', STATUS.Pending],
]
  .map(([alias, statusId]) => ({
    alias: alias as string,
    statusId: statusId as number,
    excludeAmount: false,
    isLegacy: false,
  }))
  .concat([{ alias: 'CHB 2', statusId: STATUS.Chargeback, excludeAmount: true, isLegacy: true }])

/** Example legacy rule set (provider C): sheets with old names and status given by a column. */
export const LEGACY_RULE_SET = {
  providerId: 201,
  name: 'Provider C legacy',
  sheetRules: [
    { sheetPattern: 'TRX', kind: 'transactions', cycle: 'E', statusId: null, priority: 10 }, // status from the Order Status column
    { sheetPattern: 'CB', kind: 'transactions', cycle: 'I', statusId: null, priority: 10 }, // status from a column: CHB / CHB 2
    { sheetPattern: 'Fail', kind: 'transactions', cycle: 'E', statusId: STATUS.Declined, priority: 10 },
    { sheetPattern: 'Summary', kind: 'ignore', cycle: null, statusId: null, priority: 10 },
  ],
  columnRules: [
    { sheetPattern: null, columnPattern: 'Merchant Order No#', targetField: 'transactionId', priority: 5 },
    { sheetPattern: null, columnPattern: 'Order Status', targetField: 'status', priority: 5 },
    { sheetPattern: null, columnPattern: 'Amount USD', targetField: 'amount', priority: 5 },
  ],
}

// ───────────────────────── Transactions and batches ─────────────────────────

export interface Txn {
  key: string // stable internal key to link within the plan (not the gateway ID)
  sourceTransactionId: string
  gatewayId: number
  merchantId: number
  providerId: number
  channelId: number
  channel: string
  orderId: string
  amount: number
  cardBrand: string
  status: StatusCode
  transactionDate: Date
  lastStatusChangedAt: Date | null
  appliedReservePct: number
}

export interface BatchPlan {
  account: string
  batchNo: number
  status: 'paid' | 'processed'
  settlementDate: Date
  processedAt: Date
  paidAt: Date | null
  eWindow: [Date, Date]
  iWindow: [Date, Date]
  rWindow: [Date, Date] | null
  eKeys: string[] // Successful + Declined
  iKeys: string[] // Chargeback/Refund/RDR
  rKeys: string[] // released reserves (E txns from a previous batch)
}

export interface World {
  txns: Txn[]
  txnByKey: Map<string, Txn>
  batches: BatchPlan[]
  /** Sample batch window per account (not processed). */
  sampleBatch: Record<string, BatchPlan>
}

/** Not-assigned-yet channel → account in whose sample batch it first appears. */
export const NEW_CHANNEL_FOR: Record<string, string> = { 'RAM-07': 'ProviderA-USD', 'RAM-13': 'ProviderB-Main' }

/**
 * Generates transactions per channel and day. For each account, consecutive 10-day batches
 * from firstBatchDate up to a final window that is left UNPROCESSED (it is the sample one).
 */
export function buildWorld(seed = 20261012): World {
  const rng = mulberry32(seed)
  const txns: Txn[] = []
  const txnByKey = new Map<string, Txn>()
  const batches: BatchPlan[] = []
  const sampleBatch: Record<string, BatchPlan> = {}
  let keyNo = 0

  const chanById = new Map<number, (typeof CHANNELS)[number]>(CHANNELS.map((c) => [c.channelId, c]))
  const provById = new Map<number, (typeof PROVIDERS)[number]>(PROVIDERS.map((p) => [p.providerId, p]))

  function makeTxn(channelId: number, d: Date, status: StatusCode): Txn {
    const c = chanById.get(channelId)!
    const p = provById.get(c.providerId)!
    const t: Txn = {
      key: `t${++keyNo}`,
      sourceTransactionId: c.gatewayId === 1 ? numericId(rng) : uuidV4(rng),
      gatewayId: c.gatewayId,
      merchantId: p.merchantId,
      providerId: c.providerId,
      channelId,
      channel: c.name,
      orderId: `ORD-${between(rng, 100000, 999999)}`,
      amount: ticket(rng),
      cardBrand: brand(rng),
      status,
      transactionDate: new Date(d.getTime() + between(rng, 0, 86_399) * 1000),
      lastStatusChangedAt: null,
      appliedReservePct: c.pct,
    }
    txns.push(t)
    txnByKey.set(t.key, t)
    return t
  }

  // daily volume per channel: approved and declined (≈30 % of total E)
  const perDay = (channel: string) =>
    channel.startsWith('RAM-U') ? [6, 2] : channel === 'RAM-07' || channel === 'RAM-13' ? [2, 1] : [16, 5]

  for (const acc of ACCOUNTS) {
    const channels = CHANNELS.filter((c) => c.account === acc.name)
    // new channels (not assigned yet) whose transactions appear in this account's sample batch
    const unassigned = CHANNELS.filter((c) => NEW_CHANNEL_FOR[c.name] === acc.name)
    const allChannels = [...channels, ...unassigned]
    const start = new Date(`${acc.firstBatchDate}T00:00:00Z`)
    const lastE = day(ANCHOR, -5) // 2026-10-07: close of the sample window
    const windowDays = 10

    // 1) daily E transactions
    const eByDay = new Map<string, Txn[]>()
    for (let d = start; d <= lastE; d = day(d, 1)) {
      for (const c of allChannels) {
        const [napp, ndec] = perDay(c.name)!
        for (let i = 0; i < napp; i++) {
          const t = makeTxn(c.channelId, d, 'Successful')
          ;(eByDay.get(iso(d)) ?? eByDay.set(iso(d), []).get(iso(d))!).push(t)
        }
        for (let i = 0; i < ndec; i++) {
          const t = makeTxn(c.channelId, d, 'Declined')
          ;(eByDay.get(iso(d)) ?? eByDay.set(iso(d), []).get(iso(d))!).push(t)
        }
      }
    }

    // 2) adjustments: 1.5 % chargebacks, 1 % refunds, 0.05 % RDR over approved ones, 5–40 days later
    const approved = txns.filter(
      (t) =>
        t.providerId === acc.providerId &&
        allChannels.some((c) => c.channelId === t.channelId) &&
        t.status === 'Successful',
    )
    for (const t of approved) {
      const r = rng()
      const adj: StatusCode | null = r < 0.015 ? 'Chargeback' : r < 0.025 ? 'Refund' : r < 0.0255 ? 'RDR' : null
      if (!adj) continue
      const when = day(t.transactionDate, between(rng, 5, 40))
      if (when > ANCHOR) continue
      t.status = adj
      t.lastStatusChangedAt = when
    }

    // 3) consecutive 10-day batches; the last one is left unprocessed (sample)
    let batchNo = acc.batchStart
    const releasedKeys = new Set<string>()
    // 10-day windows aligned to the close (the last one ends at lastE and is the sample)
    const windows: [Date, Date][] = []
    for (let wEnd = lastE; wEnd >= start; wEnd = day(wEnd, -windowDays)) {
      const wStart = day(wEnd, -(windowDays - 1)) < start ? start : day(wEnd, -(windowDays - 1))
      windows.unshift([wStart, wEnd])
    }
    for (const [wStart, wEnd] of windows) {
      const isSample = wEnd.getTime() === lastE.getTime()
      const iStart = wStart // adjustments dated within the same window (no overlap with the previous batch)
      const eKeys: string[] = []
      for (let d = wStart; d <= wEnd; d = day(d, 1))
        for (const t of eByDay.get(iso(d)) ?? [])
          if (channels.some((c) => c.channelId === t.channelId) || isSample) eKeys.push(t.key)
      // adjustments whose status change falls in the I window [wStart-10, wEnd]
      const iKeys = approved
        .filter(
          (t) =>
            t.lastStatusChangedAt &&
            t.lastStatusChangedAt >= iStart &&
            t.lastStatusChangedAt <= (isSample ? ANCHOR : day(wEnd, 1)) &&
            (channels.some((c) => c.channelId === t.channelId) || isSample),
        )
        .map((t) => t.key)
      // reserves: approved txns from previous batches whose term expired before this window's close
      const rKeys: string[] = []
      for (const b of batches) {
        if (b.account !== acc.name) continue
        for (const k of b.eKeys) {
          const t = txnByKey.get(k)!
          const c = chanById.get(t.channelId)!
          if (t.appliedReservePct === 0 || releasedKeys.has(k)) continue
          if (txnByKey.get(k)!.status === 'Declined') continue
          if (day(t.transactionDate, c.days) <= wEnd) rKeys.push(k)
        }
      }
      const settlementDate = day(wEnd, 17)
      const plan: BatchPlan = {
        account: acc.name,
        batchNo,
        status: 'paid',
        settlementDate,
        processedAt: day(wEnd, 15),
        paidAt: day(wEnd, 19),
        eWindow: [wStart, wEnd],
        iWindow: [iStart, wEnd],
        rWindow: rKeys.length
          ? [
              day(txnByKey.get(rKeys[0]!)!.transactionDate, 0),
              day(txnByKey.get(rKeys[rKeys.length - 1]!)!.transactionDate, 0),
            ]
          : null,
        eKeys,
        iKeys,
        rKeys,
      }
      if (isSample) {
        plan.status = 'processed'
        plan.paidAt = null
        sampleBatch[acc.name] = plan
      } else {
        for (const k of rKeys) releasedKeys.add(k)
        batches.push(plan)
      }
      batchNo++
    }
  }

  return { txns, txnByKey, batches, sampleBatch }
}

/** One SettlementTransaction of a batch plan, keyed by the world's transaction key (not the database id). */
export interface SettlementMovement {
  key: string
  cycle: 'E' | 'I' | 'R'
  statusId: number
  /** Status used for the batch totals (for R, the current one). */
  status: StatusCode
  /** DECIMAL(19,4) text, like every amount below. */
  amount: string
  feeAmount: string
  eventDate: Date
  pct: number
  days: number
  held: string
  released: string
  expectedAt: Date | null
  brand: string
}

const ZERO = text4(0)

/**
 * The movements the seed inserts for a batch plan: E with the status when settling (Successful or Declined; the
 * later adjustment is settled in I) and the held reserve, I with the current status at the date of the change and
 * the transaction amount (an RDR too: it deducts like a Chargeback or a Refund), R with the released reserve at the
 * settlement date.
 */
export function settlementMovementsOf(world: World, plan: BatchPlan): SettlementMovement[] {
  const movements: SettlementMovement[] = []
  const chan = (channelId: number) => CHANNELS.find((c) => c.channelId === channelId)!
  for (const k of plan.eKeys) {
    const t = world.txnByKey.get(k)!
    const c = chan(t.channelId)
    const st: StatusCode = t.status === 'Declined' ? 'Declined' : 'Successful'
    const held = st === 'Successful' ? reserveOf(t) : new Decimal(0)
    movements.push({
      key: k,
      cycle: 'E',
      statusId: STATUS[st],
      status: st,
      amount: st === 'Successful' ? text4(t.amount) : ZERO,
      feeAmount: feeFor(plan.account, st, t.amount, 'E'),
      eventDate: t.transactionDate,
      pct: t.appliedReservePct,
      days: c.days,
      held: held.toFixed(4),
      released: ZERO,
      expectedAt: held.isZero() ? null : new Date(t.transactionDate.getTime() + c.days * 86_400_000),
      brand: t.cardBrand,
    })
  }
  for (const k of plan.iKeys) {
    const t = world.txnByKey.get(k)!
    const c = chan(t.channelId)
    movements.push({
      key: k,
      cycle: 'I',
      statusId: STATUS[t.status],
      status: t.status,
      amount: text4(t.amount),
      feeAmount: feeFor(plan.account, t.status, t.amount, 'I'),
      eventDate: t.lastStatusChangedAt!,
      pct: t.appliedReservePct,
      days: c.days,
      held: ZERO,
      released: ZERO,
      expectedAt: null,
      brand: t.cardBrand,
    })
  }
  for (const k of plan.rKeys) {
    const t = world.txnByKey.get(k)!
    const c = chan(t.channelId)
    movements.push({
      key: k,
      cycle: 'R',
      statusId: STATUS[t.status === 'Declined' ? 'Successful' : t.status],
      status: t.status,
      amount: ZERO,
      feeAmount: ZERO,
      eventDate: plan.settlementDate,
      pct: t.appliedReservePct,
      days: c.days,
      held: ZERO,
      released: reserveOf(t).toFixed(4),
      expectedAt: null,
      brand: t.cardBrand,
    })
  }
  return movements
}

/**
 * Transactional fee applied to a movement (same rule the MVP engine uses), as DECIMAL(19,4) text: the percentage part
 * is rounded half up in the fourth decimal, then the fixed part is added.
 */
export function feeFor(account: string, status: StatusCode, amount: number, cycle: 'E' | 'I' | 'R'): string {
  const fees = ACCOUNT_FEES[account] ?? []
  if (cycle === 'R') return ZERO
  const byType = (id: number) => fees.find((f) => f.feeTypeId === id)
  const fixed = (id: number) => text4(byType(id)?.fixed ?? 0)
  if (cycle === 'E' && status === 'Successful')
    return amount4(new Decimal(amount).times(byType(1)?.pct ?? 0))
      .plus(byType(2)?.fixed ?? 0)
      .toFixed(4)
  if (cycle === 'E' && status === 'Declined') return fixed(3)
  if (cycle === 'I' && status === 'Chargeback') return fixed(4)
  if (cycle === 'I' && status === 'Refund') return fixed(5)
  if (cycle === 'I' && status === 'RDR') return fixed(6)
  return ZERO
}
