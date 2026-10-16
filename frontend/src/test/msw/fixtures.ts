// The seed's synthetic world (backend/prisma/synthetic.ts), typed with the generated contract so that a contract
// change breaks the tests' typecheck. Account UUIDs are fixed test values, not the seed's.

import { ROLES } from '@recon/shared'
import type {
  AccountChannelItem,
  AccountSummary,
  ChannelSummary,
  Me,
  MerchantSummary,
  Permission,
  ProviderSummary,
} from '@/lib/api/types'

export const PASSWORD = 'Test-Passw0rd!'

export const MERCHANTS: MerchantSummary[] = [
  { merchantId: 1, name: 'Merchant A', isActive: true },
  { merchantId: 2, name: 'Merchant B', isActive: true },
]

export const PROVIDERS: ProviderSummary[] = [
  { providerId: 101, merchantId: 1, name: 'Provider A', isActive: true },
  { providerId: 102, merchantId: 1, name: 'Provider B', isActive: true },
  { providerId: 201, merchantId: 2, name: 'Provider C', isActive: true },
]

const channel = (
  channelId: number,
  providerId: number,
  name: string,
  term: number,
  pct: string,
  days: number,
): ChannelSummary => ({
  channelId,
  gatewayId: providerId === 201 ? 2 : 1,
  providerId,
  name,
  isActive: true,
  settlementTermDays: term,
  rollingReservePct: pct,
  rollingReserveDays: days,
})

export const CHANNELS: ChannelSummary[] = [
  channel(1001, 101, 'RAM-01', 14, '0.100000', 180),
  channel(1002, 101, 'RAM-02', 14, '0.100000', 180),
  channel(1003, 101, 'RAM-03', 14, '0.100000', 180),
  channel(1007, 101, 'RAM-07', 14, '0.100000', 180),
  channel(1011, 102, 'RAM-11', 10, '0.100000', 180),
  channel(1012, 102, 'RAM-12', 10, '0.100000', 180),
  channel(1013, 102, 'RAM-13', 10, '0.050000', 120),
  channel(2001, 201, 'RAM-U1', 7, '0.000000', 0),
  channel(2002, 201, 'RAM-U2', 7, '0.050000', 180),
]

/** Channels with transactions in the seed; those without an AccountChannel row are "not assigned yet". */
export const CHANNELS_WITH_TRANSACTIONS = new Set(CHANNELS.map((c) => c.channelId))

export const ACCOUNT_IDS = {
  'ProviderA-USD': '0b6f4c1e-1a2b-4c3d-8e4f-000000000001',
  'ProviderA-EUR': '0b6f4c1e-1a2b-4c3d-8e4f-000000000002',
  'ProviderB-Main': '0b6f4c1e-1a2b-4c3d-8e4f-000000000003',
  'ProviderC-USD': '0b6f4c1e-1a2b-4c3d-8e4f-000000000004',
  'ProviderC-Alt': '0b6f4c1e-1a2b-4c3d-8e4f-000000000005',
} as const

const account = (
  name: keyof typeof ACCOUNT_IDS,
  providerId: number,
  overrides: Partial<AccountSummary> = {},
): AccountSummary => ({
  accountId: ACCOUNT_IDS[name],
  providerId,
  name,
  chargebackReservePolicy: 'hold_until_term',
  rollingReserveCapAmt: null,
  matchingRuleSetId: null,
  isActive: true,
  createdAt: '2025-03-02T00:00:00.000Z',
  ...overrides,
})

export const ACCOUNTS: AccountSummary[] = [
  account('ProviderA-USD', 101),
  account('ProviderA-EUR', 101, { rollingReserveCapAmt: '50000.0000' }),
  account('ProviderB-Main', 102, { chargebackReservePolicy: 'release_on_chargeback' }),
  account('ProviderC-USD', 201),
  account('ProviderC-Alt', 201, { matchingRuleSetId: 3 }),
]

export interface AccountChannelRow {
  accountId: string
  channelId: number
  isPrimary: boolean
}

export const ACCOUNT_CHANNELS: AccountChannelRow[] = [
  { accountId: ACCOUNT_IDS['ProviderA-USD'], channelId: 1001, isPrimary: true },
  { accountId: ACCOUNT_IDS['ProviderA-USD'], channelId: 1002, isPrimary: true },
  { accountId: ACCOUNT_IDS['ProviderA-EUR'], channelId: 1003, isPrimary: true },
  { accountId: ACCOUNT_IDS['ProviderB-Main'], channelId: 1011, isPrimary: true },
  { accountId: ACCOUNT_IDS['ProviderB-Main'], channelId: 1012, isPrimary: true },
  { accountId: ACCOUNT_IDS['ProviderC-USD'], channelId: 2001, isPrimary: true },
  { accountId: ACCOUNT_IDS['ProviderC-Alt'], channelId: 2002, isPrimary: true },
]

export const ASSIGNED_AT = '2026-09-28T00:00:00.000Z'
export const ASSIGNED_IN_BATCH = '7d1c2b3a-0000-4000-8000-000000000068'

export type UserName = 'admin' | 'analyst' | 'payments' | 'viewer'

const permissionsOf = (role: UserName): Permission[] => [...(ROLES.find((r) => r.name === role)?.permissions ?? [])]

const user = (userId: number, userName: UserName, merchantIds: number[] | 'all'): Me => ({
  userId,
  userName,
  displayName: userName.charAt(0).toUpperCase() + userName.slice(1),
  email: `${userName}@recon.local`,
  role: userName,
  permissions: permissionsOf(userName),
  merchantScope: merchantIds === 'all' ? 'all' : 'assigned',
  merchants: MERCHANTS.filter((m) => merchantIds === 'all' || merchantIds.includes(m.merchantId)).map(
    ({ merchantId, name }) => ({ merchantId, name }),
  ),
})

export const USERS: Record<UserName, Me> = {
  admin: user(1, 'admin', 'all'),
  analyst: user(2, 'analyst', [1, 2]),
  payments: user(3, 'payments', [1, 2]),
  viewer: user(4, 'viewer', [1]),
}

/** A user that exists but is inactive: login answers exactly like a wrong password. */
export const INACTIVE_USER = 'inactive_test'

export function toAccountChannelItem(row: AccountChannelRow, rows: AccountChannelRow[]): AccountChannelItem {
  const ch = CHANNELS.find((c) => c.channelId === row.channelId)!
  const primaryRow = rows.find((r) => r.channelId === row.channelId && r.isPrimary)
  const primary = primaryRow && ACCOUNTS.find((a) => a.accountId === primaryRow.accountId)
  return {
    ...ch,
    isPrimary: row.isPrimary,
    assignedAt: ASSIGNED_AT,
    assignedInBatchId: ASSIGNED_IN_BATCH,
    primaryAccount: primary ? { accountId: primary.accountId, name: primary.name } : null,
  }
}
