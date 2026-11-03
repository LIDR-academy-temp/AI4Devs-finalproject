// The fee types and fees of the seed's synthetic world (backend/prisma/synthetic.ts), shared by the fake settlement
// API (Settlement Review reads the presets) and the fake fee administration API (web-admin-fees design D8). Typed
// with the generated contract so that a contract change breaks the tests' typecheck.
import { TRANSACTION_STATUSES } from '@recon/shared'
import type { AccountFee, FeeTypeView } from '@/features/settlements/contract'
import { businessDate } from '@/lib/format'
import type { AccountName } from './import-fixtures'

const statusId = (name: string) => TRANSACTION_STATUSES.find((s) => s.name === name)?.statusId ?? null

/** The fee types of the seed (backend/prisma/synthetic.ts): transactional 1–6 and non-transactional 101–121. */
export const FEE_TYPE_VIEWS: FeeTypeView[] = [
  [1, 'MDR', 'MDR', 'Successful'],
  [2, 'TRX Fee - Deposit', 'Deposit per txn fee', 'Successful'],
  [3, 'TRX Fee - Decline', 'Decline fee', 'Declined'],
  [4, 'Chargeback', 'Chargeback per txn fee', 'Chargeback'],
  [5, 'Refund', 'Refund per txn fee', 'Refund'],
  [6, 'RDR', 'RDR per txn fee', 'RDR'],
]
  .map(([feeTypeId, code, title, status]) => ({
    feeTypeId: feeTypeId as number,
    code: code as string,
    title: title as string,
    isTransactional: true,
    appliesToStatusId: statusId(status as string),
    allowsFreeAmount: false,
  }))
  .concat(
    (
      [
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
      ] as const
    ).map(([code, free], i) => ({
      feeTypeId: 101 + i,
      code,
      title: code,
      isTransactional: false,
      appliesToStatusId: null,
      allowsFreeAmount: free,
    })),
  )

export const feeTypeOf = (feeTypeId: number) => FEE_TYPE_VIEWS.find((t) => t.feeTypeId === feeTypeId)

/** The "today" of the fixtures' statuses (the spec example of admin-fees, "Programado, cerrado y activo"). */
export const FIXTURE_TODAY = '2026-11-03'

let fixtureSeq = 0

/**
 * A fee of an account as the API returns it. The defaults are an open fee (NULL…NULL) in use, created by admin; the
 * status is derived from the validity against FIXTURE_TODAY unless given.
 */
export function feeFixture(
  overrides: Partial<Omit<AccountFee, 'startDate' | 'endDate'>> & {
    feeTypeId: number
    startDate?: string | null
    endDate?: string | null
  },
): AccountFee {
  fixtureSeq += 1
  const type = feeTypeOf(overrides.feeTypeId)!
  const startDate = overrides.startDate ?? null
  const endDate = overrides.endDate ?? null
  return {
    feeId: `f0000000-0000-4000-9000-${String(fixtureSeq).padStart(12, '0')}`,
    code: type.code,
    title: type.title,
    isTransactional: type.isTransactional,
    fixedAmount: null,
    percentage: null,
    conditionalPercentage: null,
    conditionThresholdAmt: null,
    brandFixedAmount: null,
    brandPercentage: null,
    description: null,
    status: feeStatus(startDate, endDate, FIXTURE_TODAY),
    inUse: true,
    lastAppliedEventDate: '2026-10-15',
    createdBy: { userId: 1, userName: 'admin' },
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
    ...overrides,
    startDate: startDate === null ? null : businessDate(startDate),
    endDate: endDate === null ? null : businessDate(endDate),
  }
}

/** admin-fees design D7: scheduled if it starts after today, closed if it ended before today, active otherwise. */
export function feeStatus(startDate: string | null, endDate: string | null, today: string): AccountFee['status'] {
  if (startDate !== null && startDate > today) return 'scheduled'
  if (endDate !== null && endDate < today) return 'closed'
  return 'active'
}

const preset = (feeId: string, feeTypeId: number, fixedAmount: string | null, percentage: string | null) =>
  feeFixture({ feeId, feeTypeId, fixedAmount, percentage })

/** The non-transactional fees of each account in the seed (ACCOUNT_FEES of synthetic.ts). */
export const ACCOUNT_FEES: Record<AccountName, AccountFee[]> = {
  'ProviderA-USD': [preset('f0000000-0000-4000-8000-000000000105', 105, null, '0.010000')],
  'ProviderA-EUR': [preset('f0000000-0000-4000-8000-000000000205', 105, null, '0.010000')],
  'ProviderB-Main': [preset('f0000000-0000-4000-8000-000000000311', 111, '250.0000', null)],
  'ProviderC-USD': [],
  'ProviderC-Alt': [],
}

/**
 * The per-movement fees of each account: active, scheduled and closed, in use and not, so that the fee screens have
 * every case. Settlement Review never reads them (it asks transactional=false).
 */
export const TRANSACTIONAL_FEES: Record<AccountName, AccountFee[]> = {
  'ProviderA-USD': [
    feeFixture({ feeTypeId: 1, percentage: '0.030000', endDate: '2025-12-31', lastAppliedEventDate: '2025-12-30' }),
    feeFixture({ feeTypeId: 1, percentage: '0.029000', startDate: '2026-01-01' }),
    feeFixture({ feeTypeId: 2, fixedAmount: '0.1200', startDate: '2026-01-01' }),
    feeFixture({ feeTypeId: 4, fixedAmount: '15.0000', description: 'Chargeback fee' }),
    feeFixture({
      feeTypeId: 5,
      fixedAmount: '5.0000',
      startDate: '2027-01-01',
      inUse: false,
      lastAppliedEventDate: null,
    }),
  ],
  'ProviderA-EUR': [
    feeFixture({ feeTypeId: 1, percentage: '0.031000', startDate: '2025-09-01' }),
    feeFixture({ feeTypeId: 4, fixedAmount: '15.0000', startDate: '2025-09-01' }),
  ],
  'ProviderB-Main': [feeFixture({ feeTypeId: 1, percentage: '0.025000', inUse: false, lastAppliedEventDate: null })],
  'ProviderC-USD': [feeFixture({ feeTypeId: 1, percentage: '0.027500' })],
  'ProviderC-Alt': [feeFixture({ feeTypeId: 4, fixedAmount: '10.0000' })],
}
