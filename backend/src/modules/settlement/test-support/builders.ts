/** Small builders of settlement engine input for the domain tests (one row, one transaction, one fee). */
import type {
  AccountFeeConfig,
  MovementPlan,
  SettlementChannel,
  SettlementFeeType,
  SettlementInput,
  SettlementRow,
  SettlementTransactionData,
} from '../domain/types.js'

export const SHEET = '5a000000-0000-4000-8000-000000000001'
export const FILE = '5f000000-0000-4000-8000-000000000001'
export const ACCOUNT_ID = 'a0000000-0000-4000-8000-000000000001'

export function txn(
  overrides: Partial<SettlementTransactionData> & { transactionId: bigint },
): SettlementTransactionData {
  return {
    sourceTransactionId: String(100_000_000_000_000n + overrides.transactionId),
    providerId: 101,
    channelId: 1001,
    amount: '100.0000',
    statusCode: 'Successful',
    transactionDate: new Date('2026-09-30T10:00:00.000Z'),
    lastStatusChangedAt: null,
    appliedReservePct: '0.100000',
    cardBrand: 'VISA',
    ...overrides,
  }
}

export function row(
  rowNo: number,
  overrides: Partial<SettlementRow> = {},
  transaction: SettlementTransactionData | null = txn({ transactionId: BigInt(rowNo) }),
): SettlementRow {
  return {
    fileId: FILE,
    fileOrder: 0,
    sheetId: SHEET,
    sheetOrder: 0,
    rowNo,
    cycle: 'E',
    statusCode: 'Successful',
    excludeAmount: false,
    matchResult: transaction === null ? 'unmatched' : 'matched',
    ignore: false,
    txnDate: null,
    transaction,
    ...overrides,
  }
}

export const RAM_01: SettlementChannel = {
  channelId: 1001,
  name: 'RAM-01',
  rollingReserveDays: 180,
  assignment: 'assigned',
  otherAccount: null,
}

export function fee(overrides: Partial<AccountFeeConfig> & { feeTypeId: number }): AccountFeeConfig {
  return {
    feeId: `fe000000-0000-4000-8000-${String(overrides.feeTypeId).padStart(12, '0')}`,
    fixedAmount: null,
    percentage: null,
    conditionalPercentage: null,
    conditionThresholdAmt: null,
    brandFixedAmount: null,
    brandPercentage: null,
    startDate: null,
    endDate: null,
    description: null,
    ...overrides,
  }
}

/** The fee types of the seed that the tests use: the six transactional ones and a few batch categories. */
export const FEE_TYPES: SettlementFeeType[] = [
  {
    feeTypeId: 1,
    code: 'MDR',
    title: 'MDR',
    isTransactional: true,
    appliesToStatusCode: 'Successful',
    allowsFreeAmount: false,
  },
  {
    feeTypeId: 2,
    code: 'TRX Fee - Deposit',
    title: 'Deposit per txn fee',
    isTransactional: true,
    appliesToStatusCode: 'Successful',
    allowsFreeAmount: false,
  },
  {
    feeTypeId: 4,
    code: 'Chargeback',
    title: 'Chargeback per txn fee',
    isTransactional: true,
    appliesToStatusCode: 'Chargeback',
    allowsFreeAmount: false,
  },
  {
    feeTypeId: 105,
    code: 'Chargeback over 1%',
    title: 'Chargeback over 1%',
    isTransactional: false,
    appliesToStatusCode: null,
    allowsFreeAmount: true,
  },
  {
    feeTypeId: 111,
    code: 'Monthly Fee',
    title: 'Monthly Fee',
    isTransactional: false,
    appliesToStatusCode: null,
    allowsFreeAmount: false,
  },
  {
    feeTypeId: 117,
    code: 'Settlement Fee',
    title: 'Settlement Fee',
    isTransactional: false,
    appliesToStatusCode: null,
    allowsFreeAmount: false,
  },
  {
    feeTypeId: 119,
    code: 'Special Adjustment',
    title: 'Special Adjustment',
    isTransactional: false,
    appliesToStatusCode: null,
    allowsFreeAmount: true,
  },
  {
    feeTypeId: 121,
    code: 'Wire Fee',
    title: 'Wire Fee',
    isTransactional: false,
    appliesToStatusCode: null,
    allowsFreeAmount: false,
  },
]

export function input(overrides: Partial<SettlementInput> = {}): SettlementInput {
  return {
    importId: '1a000000-0000-4000-8000-000000000001',
    account: {
      accountId: ACCOUNT_ID,
      name: 'ProviderA-USD',
      providerId: 101,
      chargebackReservePolicy: 'hold_until_term',
      rollingReserveCapAmt: null,
    },
    runId: 12,
    ranges: { APP: null, DEC: null, I: null, R: null },
    rows: [],
    inclusions: [],
    channels: [RAM_01],
    previousE: new Set(),
    fees: [],
    feeTypes: FEE_TYPES,
    attempts: [],
    prefilledFeeTypeIds: new Set(),
    request: {},
    options: { transactionalFees: false },
    ...overrides,
  }
}

/** A movement of the plan: an E Successful of 100.0000 from row `rowNo`, unless overridden. */
export function movement(rowNo: number, overrides: Partial<MovementPlan> = {}): MovementPlan {
  return {
    sheetId: SHEET,
    rowNo,
    transactionId: BigInt(rowNo),
    sourceTransactionId: String(100_000_000_000_000 + rowNo),
    channelId: 1001,
    cardBrand: 'VISA',
    cycle: 'E',
    statusCode: 'Successful',
    amount: '100.0000',
    gatewayAmount: '100.0000',
    excludeAmount: false,
    eventDate: new Date('2026-09-30T10:00:00.000Z'),
    roundNo: null,
    appliedReservePct: '0.100000',
    reserveDaysUsed: 180,
    expectedReserveReleaseAt: null,
    reservePolicySnapshot: null,
    reserveHeldAmt: '0.0000',
    reserveReleasedAmt: '0.0000',
    reserveEarlyReleasedAmt: '0.0000',
    feeAmount: '0.0000',
    fees: [],
    ...overrides,
  }
}
