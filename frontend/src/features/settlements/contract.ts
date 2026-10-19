// TEMPORARY until #11 (settlement-process) and #12 are merged: the "Contract for #13" and "Contract for #12" of the
// settlement-process design, copied by hand, and the only place that knows the settlement routes (web-settlement
// design D2). The rebase replaces these types with aliases of the generated ones and the calls with the typed `api`
// client, keeping the exported names. Money and rates are always strings: no type here admits a number for an amount.
import type { BatchStatus, ImportStatus } from '@recon/shared'
import { ApiError } from '@/lib/api/client'
import { type AuditInstant, auditInstant, type BusinessDate, businessDate } from '@/lib/format'
import { apiOrigin } from '@/lib/session/api-origin'
import { createAuthFetch } from '@/lib/session/auth-fetch'
import { session } from '@/lib/session/session'

export type { AuditInstant, BusinessDate }

/** Decimal string with 4 decimals ("1234.5600"); negative only in batch fees. */
export type Money = string
/** Decimal string with 6 decimals ("0.100000"). */
export type Rate = string

export interface UserRef {
  userId: number
  userName: string
}

export type Category = 'deposit' | 'declined' | 'chargeback' | 'refund' | 'rdr'

/** Inclusive range of business dates. */
export interface DateRange {
  min: BusinessDate
  max: BusinessDate
}

export interface BatchFeeInput {
  feeTypeId: number
  /** Preset fee of the account (uuid), or null for a free amount. */
  feeId: string | null
  /** Up to 4 decimals, not zero. */
  amount: Money
  /** Up to 200 characters; required by the API for a free amount. */
  description?: string
  /** `file` = pre-filled from Other Fees (kept as sent by GET /imports/{id}). */
  source: 'file' | 'manual'
}

export interface SettlementRequest {
  /** The validation run the analyst reviewed. */
  runId: number
  /** Positive integer; omitted → the proposed number. */
  batchNo?: number
  /** YYYY-MM-DD, a business date (required by the screen, P8 of #11). */
  settlementDate?: string
  /** Up to 500 characters, audit only. */
  note?: string
  confirmChannelAssignment?: boolean
  /** Omitted → none. */
  batchFees?: BatchFeeInput[]
}

export interface Skipped {
  ignored: number
  unmatched: number
  ambiguous: number
  excluded: number
  unresolvedStatus: number
  pending: number
}

export type SettlementWarning =
  | { code: 'undated_adjustment'; transactionId: string; sheetId: string; rowNo: number; feeSkipped: boolean }
  | { code: 'reserve_already_released'; transactionId: string; sheetId: string; rowNo: number }
  | {
      code:
        | 'no_transactional_fees'
        | 'reserve_cap_not_applied'
        | 'transactional_fees_not_computed'
        | 'chargeback_reserve_policy_not_applied'
    }
  | { code: 'fee_variant_not_applied'; feeId: string }

export interface CategoryTotal {
  category: Category
  qty: number
  amount: Money
  feeAmount: Money
  feeRate: Rate | null
}

export interface BrandTotal {
  cardBrand: string
  qty: number
  amount: Money
}

export interface BatchFeeView {
  /** Null in a preview. */
  batchFeeId: number | null
  feeTypeId: number
  code: string
  title: string
  feeId: string | null
  amount: Money
  description: string | null
  source: 'file' | 'manual'
  /** Null in a preview. */
  enteredBy: UserRef | null
}

export type PayableLineCode =
  | 'deposit'
  | 'chargeback'
  | 'refund'
  | 'rdr'
  | 'transactional_fees'
  | 'batch_fees'
  | 'reserve_held'
  | 'reserve_released'
  | 'reserve_early_released'

/** Always the nine lines, in this order; their signed sum is amountPayable, computed by the server. */
export interface PayableLine {
  code: PayableLineCode
  label: string
  sign: '+' | '-'
  amount: Money
}

export interface OtherAccount {
  accountId: string
  name: string
}

export interface ChannelToAssign {
  channelId: number
  name: string
  assignment: 'unassigned' | 'assigned_to_other_account'
  otherAccount: OtherAccount | null
}

export interface SettlementFigures {
  dateRanges: { APP: DateRange | null; DEC: DateRange | null; I: DateRange | null; R: DateRange | null }
  /** Channel names of the movements, sorted. */
  channels: string[]
  movements: { E: number; I: number; R: number }
  /** Always the five categories, in this order. */
  totals: CategoryTotal[]
  brandTotals: BrandTotal[]
  reservesReleasedQty: number
  mdrAmt: Money
  mdrRate: Rate | null
  transactionalFeeAmt: Money
  batchFees: BatchFeeView[]
  otherFeeAmt: Money
  reserveHeldAmt: Money
  reserveReleasedAmt: Money
  reserveEarlyReleasedAmt: Money
  amountPayable: Money
  payableBreakdown: PayableLine[]
  skipped: Skipped
  warnings: SettlementWarning[]
}

export interface SettlementPreview extends SettlementFigures {
  importId: string
  accountId: string
  runId: number
  batchNo: number
  attemptNo: number
  batchNoAvailable: boolean
  requiresChannelConfirmation: boolean
  channelsToAssign: ChannelToAssign[]
}

export interface ChannelAssigned {
  channelId: number
  name: string
  assignment: 'new_primary' | 'primary_moved_from'
  previousAccount: OtherAccount | null
}

export interface SettlementView extends SettlementFigures {
  batchId: string
  importId: string
  accountId: string
  accountName: string
  batchNo: number
  attemptNo: number
  status: BatchStatus
  settledStatus: 'pending_payment' | 'settled' | 'undone'
  approvedBy: UserRef
  /** Audit instant (UTC). */
  processedAt: AuditInstant
  /** Business date (YYYY-MM-DD). */
  settlementDate: BusinessDate | null
  channelsAssigned: ChannelAssigned[]
  validationSummary: { runId: number; persistent: number; resolved: number; blocking: number; resolvedMissing: number }
  /** Served by #12. */
  exports: { summary: string; transactions: string; reserves: string }
}

export interface NextBatchNumber {
  accountId: string
  batchNo: number
  attemptNo: number
  reason: 'next' | 'reprocess'
}

export interface AccountFee {
  feeId: string
  feeTypeId: number
  code: string
  title: string
  isTransactional: boolean
  fixedAmount: Money | null
  percentage: Rate | null
  /** Business date; null = always. */
  startDate: BusinessDate | null
  /** Business date; null = no end. */
  endDate: BusinessDate | null
  description: string | null
}

export interface FeeTypeView {
  feeTypeId: number
  code: string
  title: string
  isTransactional: boolean
  appliesToStatusId: number | null
  allowsFreeAmount: boolean
}

export type BatchFeeInvalidReason =
  | 'unknown_fee_type'
  | 'transactional_fee_type'
  | 'fee_not_in_account'
  | 'fee_type_mismatch'
  | 'fee_not_in_force'
  | 'free_amount_not_allowed'
  | 'description_required'

/** `details` of the errors the screens read. */
export interface ErrorDetails {
  import_not_validated: { status: ImportStatus }
  validation_run_superseded: { runId: number; currentRunId: number | null }
  validation_run_required: Record<string, never>
  blocking_validation_issue: { runId: number; validationCodes: string[]; issueIds: number[] }
  batch_no_taken: { batchNo: number; attemptNo: number; importId: string }
  channel_assignment_not_confirmed: { channels: ChannelToAssign[] }
  /** A reason this screen does not know yet gets a generic text. */
  batch_fee_invalid: { index: number; reason: BatchFeeInvalidReason | (string & {}) }
}

export type ExportType = 'summary' | 'transactions' | 'reserves'

// --- Calls ---------------------------------------------------------------------------------------------------------

const authFetch = createAuthFetch(session)

/** The error body of a non-2xx answer as ApiError. */
async function toApiError(response: Response): Promise<ApiError> {
  const error = ((await response.json().catch(() => undefined)) ?? {}) as {
    code?: string
    message?: string
    details?: unknown
  }
  return new ApiError(response.status, error.code, error.message ?? `HTTP ${response.status}`, error.details)
}

/** One JSON request to the API; the body of a 2xx answer, typed with the contract, or ApiError. */
async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await authFetch(
    new Request(`${apiOrigin()}/api/v1${path}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    }),
  )
  if (!response.ok) throw await toApiError(response)
  return (await response.json()) as T
}

const brandRange = (range: DateRange | null): DateRange | null =>
  range && { min: businessDate(range.min), max: businessDate(range.max) }

/** The figures with their dates branded by kind (D2). */
function datedFigures<F extends SettlementFigures>(figures: F): F {
  const { APP, DEC, I, R } = figures.dateRanges
  return { ...figures, dateRanges: { APP: brandRange(APP), DEC: brandRange(DEC), I: brandRange(I), R: brandRange(R) } }
}

function datedView(view: SettlementView): SettlementView {
  return {
    ...datedFigures(view),
    processedAt: auditInstant(view.processedAt),
    settlementDate: view.settlementDate === null ? null : businessDate(view.settlementDate),
  }
}

export const getNextBatchNumber = (accountId: string, importId: string) =>
  request<NextBatchNumber>(
    'GET',
    `/accounts/${accountId}/batch-number/next?${new URLSearchParams({ importId }).toString()}`,
  )

export async function getAccountFees(accountId: string, query: { transactional: boolean; asOf: string }) {
  const params = new URLSearchParams({ transactional: String(query.transactional), asOf: query.asOf })
  const fees = await request<AccountFee[]>('GET', `/accounts/${accountId}/fees?${params.toString()}`)
  return fees.map((fee) => ({
    ...fee,
    startDate: fee.startDate === null ? null : businessDate(fee.startDate),
    endDate: fee.endDate === null ? null : businessDate(fee.endDate),
  }))
}

export const getFeeTypes = () => request<FeeTypeView[]>('GET', '/fee-types')

export const previewSettlement = async (importId: string, body: SettlementRequest, signal?: AbortSignal) =>
  datedFigures(await request<SettlementPreview>('POST', `/imports/${importId}/settlements/preview`, body, signal))

export const processSettlement = async (importId: string, body: SettlementRequest) =>
  datedView(await request<SettlementView>('POST', `/imports/${importId}/settlements`, body))

export const getSettlement = async (batchId: string) =>
  datedView(await request<SettlementView>('GET', `/settlements/${batchId}`))

/** A downloaded export: the file and the name the API gave it in Content-Disposition, if it could be read. */
export interface DownloadedExport {
  blob: Blob
  fileName: string | null
  contentType: string | null
}

/** File name of a Content-Disposition header (`filename*=UTF-8''…` or `filename="…"`). */
export function fileNameOf(disposition: string | null): string | null {
  if (!disposition) return null
  const extended = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(disposition)
  if (extended) return decodeURIComponent(extended[1]!.trim())
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(disposition)
  return plain ? plain[1]!.trim() : null
}

/** GET of an export URL of the view (a path with /api/v1), authenticated: the links need the Bearer token (D12). */
export async function downloadSettlementExport(url: string): Promise<DownloadedExport> {
  const response = await authFetch(new Request(`${apiOrigin()}${url}`, { method: 'GET' }))
  if (!response.ok) throw await toApiError(response)
  return {
    blob: await response.blob(),
    fileName: fileNameOf(response.headers.get('content-disposition')),
    contentType: response.headers.get('content-type'),
  }
}
