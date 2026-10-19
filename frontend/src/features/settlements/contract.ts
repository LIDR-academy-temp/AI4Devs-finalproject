// The settlement routes of #11 (settlement-process), the only place of the screens that knows them (web-settlement
// design D2). Types are aliases of the generated contract with the dates branded by kind; the calls go through the
// typed `api` client. The names exported are the ones the screens used with the hand-copied contract before #11.
// TEMPORARY until #12 is merged: GET /settlements/{id} and the export downloads are not in docs/openapi.yaml yet, so
// those two calls stay hand-written ("Contract for #12" of the settlement-process design), typed with the view of the
// 201 of processing, which is the same SettlementView. Money and rates are always strings.
import type { ImportStatus } from '@recon/shared'
import { ApiError, api, unwrap } from '@/lib/api/client'
import type { paths } from '@/lib/api/schema.gen'
import type { ApiResponse } from '@/lib/api/types'
import type { AuditInstant, BusinessDate } from '@/lib/format'
import { apiOrigin } from '@/lib/session/api-origin'
import { createAuthFetch } from '@/lib/session/auth-fetch'
import { session } from '@/lib/session/session'

export type { AuditInstant, BusinessDate }

// Dates by kind: business dates (date ranges, the settlement date, fee validity) are New York dates, the ranges sent
// with a Z; the processing instant is a UTC audit instant.
type BusinessKey = 'min' | 'max' | 'settlementDate' | 'startDate' | 'endDate'
type AuditKey = 'processedAt'
type Brand<V, B> = V extends string ? B : V
/** The generated type with each date field typed by its kind, at any depth. */
type Dated<T> = T extends readonly (infer U)[]
  ? Dated<U>[]
  : T extends object
    ? {
        [K in keyof T]: K extends BusinessKey
          ? Brand<T[K], BusinessDate>
          : K extends AuditKey
            ? Brand<T[K], AuditInstant>
            : Dated<T[K]>
      }
    : T

type ProcessPath = '/api/v1/imports/{importId}/settlements'
type PreviewPath = '/api/v1/imports/{importId}/settlements/preview'
type NextPath = '/api/v1/accounts/{accountId}/batch-number/next'
type FeesPath = '/api/v1/accounts/{accountId}/fees'
type JsonRequest<B> = B extends { content: { 'application/json': infer Body } } ? Body : never

/** Body of the preview and of Process. */
export type SettlementRequest = JsonRequest<paths[ProcessPath]['post']['requestBody']>
export type BatchFeeInput = NonNullable<SettlementRequest['batchFees']>[number]

export type SettlementPreview = Dated<ApiResponse<PreviewPath, 'post'>>
/** An attempt as written: the 201 of processing and, in #12, GET /settlements/{id}. */
export type SettlementView = Dated<ApiResponse<ProcessPath, 'post', 201>>
/** What the preview and the view share. */
export type SettlementFigures = Omit<
  SettlementPreview,
  | 'importId'
  | 'accountId'
  | 'runId'
  | 'batchNo'
  | 'attemptNo'
  | 'batchNoAvailable'
  | 'requiresChannelConfirmation'
  | 'channelsToAssign'
>

/** Decimal string with 4 decimals ("1234.5600"); negative only in batch fees. */
export type Money = SettlementFigures['amountPayable']
/** Decimal string with 6 decimals ("0.100000"). */
export type Rate = NonNullable<SettlementFigures['mdrRate']>
export type UserRef = SettlementView['approvedBy']
export type CategoryTotal = SettlementFigures['totals'][number]
export type Category = CategoryTotal['category']
/** Inclusive range of business dates. */
export type DateRange = NonNullable<SettlementFigures['dateRanges']['APP']>
export type BrandTotal = SettlementFigures['brandTotals'][number]
export type BatchFeeView = SettlementFigures['batchFees'][number]
export type Skipped = SettlementFigures['skipped']
export type SettlementWarning = SettlementFigures['warnings'][number]
/** Always the nine lines, in this order; their signed sum is amountPayable, computed by the server. */
export type PayableLine = SettlementFigures['payableBreakdown'][number]
export type PayableLineCode = PayableLine['code']
export type ChannelToAssign = SettlementPreview['channelsToAssign'][number]
/** The other account of a channel: named, or only `outOfScope` when its merchant is outside the caller's scope. */
export type OtherAccount = NonNullable<ChannelToAssign['otherAccount']>
export type ChannelAssigned = SettlementView['channelsAssigned'][number]
export type ValidationSummary = NonNullable<SettlementView['validationSummary']>

export type NextBatchNumber = ApiResponse<NextPath, 'get'>
export type AccountFee = Dated<ApiResponse<FeesPath, 'get'>[number]>
export type FeeTypeView = ApiResponse<'/api/v1/fee-types', 'get'>[number]

export type BatchFeeInvalidReason =
  | 'unknown_fee_type'
  | 'transactional_fee_type'
  | 'fee_not_in_account'
  | 'fee_type_mismatch'
  | 'fee_not_in_force'
  | 'free_amount_not_allowed'
  | 'description_required'

/**
 * `details` of the errors the screens read; the generated error body types them as unknown, so the screens have a
 * text for when they are missing.
 */
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
// The casts only brand the dates of an answer typed by the generated contract.

export const getNextBatchNumber = (accountId: string, importId: string) =>
  unwrap(
    api.GET('/api/v1/accounts/{accountId}/batch-number/next', { params: { path: { accountId }, query: { importId } } }),
  )

export const getAccountFees = (accountId: string, query: { transactional: boolean; asOf: string }) =>
  unwrap(
    api.GET('/api/v1/accounts/{accountId}/fees', {
      params: {
        path: { accountId },
        query: { transactional: query.transactional ? 'true' : 'false', asOf: query.asOf },
      },
    }),
  ) as Promise<AccountFee[]>

export const getFeeTypes = () => unwrap(api.GET('/api/v1/fee-types'))

export const previewSettlement = (importId: string, body: SettlementRequest, signal?: AbortSignal) =>
  unwrap(
    api.POST('/api/v1/imports/{importId}/settlements/preview', { params: { path: { importId } }, body, signal }),
  ) as Promise<SettlementPreview>

export const processSettlement = (importId: string, body: SettlementRequest) =>
  unwrap(
    api.POST('/api/v1/imports/{importId}/settlements', { params: { path: { importId } }, body }),
  ) as Promise<SettlementView>

// --- Calls of #12, hand-written until its merge ----------------------------------------------------------------------

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

export async function getSettlement(batchId: string): Promise<SettlementView> {
  const response = await authFetch(new Request(`${apiOrigin()}/api/v1/settlements/${batchId}`, { method: 'GET' }))
  if (!response.ok) throw await toApiError(response)
  return (await response.json()) as SettlementView
}

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
