// The settlement routes of #11 (settlement-process) and #12 (summary-exports), the only place of the screens that
// knows them (web-settlement design D2). Types are aliases of the generated contract with the dates branded by kind;
// the calls go through the typed `api` client. Money and rates are always strings.
import type {
  BatchFeeInvalidDetails,
  BatchNoTakenDetails,
  ChannelAssignmentNotConfirmedDetails,
  ImportNotValidatedDetails,
} from '@recon/shared'
import { api, unwrap } from '@/lib/api/client'
import type { paths } from '@/lib/api/schema.gen'
import type { ApiResponse } from '@/lib/api/types'
import type { AuditInstant, BusinessDate } from '@/lib/format'

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
type ExportPath = '/api/v1/settlements/{batchId}/export'
type JsonRequest<B> = B extends { content: { 'application/json': infer Body } } ? Body : never

/** Body of the preview and of Process. */
export type SettlementRequest = JsonRequest<paths[ProcessPath]['post']['requestBody']>
export type BatchFeeInput = NonNullable<SettlementRequest['batchFees']>[number]

export type SettlementPreview = Dated<ApiResponse<PreviewPath, 'post'>>
/** An attempt as written: the 201 of processing, the same view GET /settlements/{id} answers. */
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

/**
 * `details` of the errors the screens read, as @recon/shared defines them; the generated error body types them as
 * unknown, so the screens have a text for when they are missing (and for a reason they do not know yet).
 */
export interface ErrorDetails {
  import_not_validated: ImportNotValidatedDetails
  batch_no_taken: BatchNoTakenDetails
  channel_assignment_not_confirmed: ChannelAssignmentNotConfirmedDetails
  batch_fee_invalid: BatchFeeInvalidDetails
}

export type ExportType = NonNullable<paths[ExportPath]['get']['parameters']['query']>['type']

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

/** The attempt as written; the same SettlementView as the 201 of processing. */
export const getSettlement = (batchId: string) =>
  unwrap(api.GET('/api/v1/settlements/{batchId}', { params: { path: { batchId } } })) as Promise<SettlementView>

/** A downloaded export: the file and the name the API gave it in Content-Disposition, if it could be read. */
export interface DownloadedExport {
  blob: Blob
  fileName: string | null
  contentType: string | null
}

/**
 * File name of a Content-Disposition header (`filename*=UTF-8''…` or `filename="…"`). A name that cannot be decoded
 * is no name: the caller uses the name of the attempt, and the download goes on.
 */
export function fileNameOf(disposition: string | null): string | null {
  if (!disposition) return null
  const extended = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(disposition)
  if (extended) {
    try {
      return decodeURIComponent(extended[1]!.trim())
    } catch {
      // Malformed percent-encoding: fall through to the plain filename, if any.
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(disposition)
  return plain ? plain[1]!.trim() : null
}

/** An export of the attempt, authenticated: the links of `exports` need the Bearer token (D12). Errors are JSON. */
export async function downloadSettlementExport(batchId: string, type: ExportType): Promise<DownloadedExport> {
  const call = api.GET('/api/v1/settlements/{batchId}/export', {
    params: { path: { batchId }, query: { type } },
    parseAs: 'blob',
  })
  const blob = await unwrap(call)
  const { response } = await call
  return {
    blob,
    fileName: fileNameOf(response.headers.get('content-disposition')),
    contentType: response.headers.get('content-type'),
  }
}
