// The validation routes of #9 (validation-runs), the only place of the screen that knows them (web-validations design
// D2, D13). Types are aliases of the generated contract with the dates branded by kind (D11); the calls go through the
// typed `api` client. The names exported are the ones the screen used with the hand-copied contract before #9.
import type { ImportStatus, IssueType, OccurrenceSource, ValidationCode } from '@recon/shared'
import { api, unwrap } from '@/lib/api/client'
import type { paths } from '@/lib/api/schema.gen'
import type { ApiResponse } from '@/lib/api/types'
import type { AuditInstant, BusinessDate } from '@/lib/format'

export type { AuditInstant, BusinessDate }

// Dates by kind (D11): business dates are New York wall-clock time sent with a Z; audit dates are UTC instants.
type BusinessKey = 'min' | 'max' | 'relevantDate'
type AuditKey = 'runAt' | 'reviewedAt' | 'invalidatedAt' | 'changedAt' | 'resolvedAt' | 'at'
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

type RunPath = '/api/v1/imports/{importId}/validations'
type IssuesPath = '/api/v1/imports/{importId}/validation-issues'
type IssuePath = '/api/v1/validation-issues/{issueId}'
type OccurrencePath = '/api/v1/conflict-occurrences/{occurrenceId}'
type ReviewPath = '/api/v1/imports/{importId}/review'
type JsonRequest<B> = B extends { content: { 'application/json': infer Body } } ? Body : never

export type ValidationRunView = Dated<ApiResponse<RunPath, 'get'>>
export type ValidationRun = NonNullable<ValidationRunView['run']>
export type ValidationResultView = ValidationRun['results'][number]
export type RunReview = NonNullable<ValidationRun['review']>
export type DateRange = NonNullable<ValidationRun['ranges']['APP']>
export type InvalidatedReview = NonNullable<ValidationRunView['lastInvalidatedReview']>
export type UserRef = ValidationRun['runBy']

export type ValidationIssuesPage = Dated<ApiResponse<IssuesPath, 'get'>>
export type ValidationIssueSummary = ValidationIssuesPage['items'][number]
export type ValidationIssuesQuery = NonNullable<paths[IssuesPath]['get']['parameters']['query']>

export type ValidationIssueDetail = Dated<ApiResponse<IssuePath, 'get'>>
export type OccurrenceView = ValidationIssueDetail['occurrences'][number]
export type OccurrenceBatch = NonNullable<OccurrenceView['batch']>
export type IssueHistoryEntry = ValidationIssueDetail['history'][number]
export type RowLocation = NonNullable<OccurrenceView['location']>
export type StatusRef = NonNullable<OccurrenceView['status']>

export type ResolveIssueBody = JsonRequest<paths[IssuePath]['patch']['requestBody']>
export type InclusionBody = JsonRequest<paths[OccurrencePath]['patch']['requestBody']>
export type ReviewBody = JsonRequest<paths[ReviewPath]['post']['requestBody']>

/** `details` of the errors the screen reads; the generated error body types them as unknown. */
export interface ErrorDetails {
  import_not_analyzed: { status: ImportStatus }
  import_changed: { status: ImportStatus }
  import_not_editable: { status: ImportStatus }
  validation_run_superseded: { runId: number; currentRunId: number }
  validation_run_required: Record<string, never>
  blocking_validation_issue: { runId: number; validationCodes: ValidationCode[]; issueIds: number[] }
  occurrence_not_editable: { sourceType: OccurrenceSource }
  occurrence_not_includable: { reason: 'reserve_already_included' | 'reserve_already_released' }
  issue_already_resolved: { resolvedAt: AuditInstant; resolvedBy: UserRef }
  issue_not_resolvable: { issueType: IssueType }
}

// --- Calls ---------------------------------------------------------------------------------------------------------
// The casts only brand the dates of an answer typed by the generated contract.

export const getValidationRun = (importId: string) =>
  unwrap(
    api.GET('/api/v1/imports/{importId}/validations', { params: { path: { importId } } }),
  ) as Promise<ValidationRunView>

export const runValidations = (importId: string) =>
  unwrap(
    api.POST('/api/v1/imports/{importId}/validations', { params: { path: { importId } } }),
  ) as Promise<ValidationRunView>

export const listValidationIssues = (importId: string, query: ValidationIssuesQuery) =>
  unwrap(
    api.GET('/api/v1/imports/{importId}/validation-issues', { params: { path: { importId }, query } }),
  ) as Promise<ValidationIssuesPage>

export const getValidationIssue = (issueId: number) =>
  unwrap(
    api.GET('/api/v1/validation-issues/{issueId}', { params: { path: { issueId: String(issueId) } } }),
  ) as Promise<ValidationIssueDetail>

export const resolveIssue = (issueId: number, note: string) =>
  unwrap(
    api.PATCH('/api/v1/validation-issues/{issueId}', {
      params: { path: { issueId: String(issueId) } },
      body: { resolutionStatus: 'resolved', note },
    }),
  ) as Promise<ValidationIssueDetail>

export const setOccurrenceInclusion = (occurrenceId: string, includeInSettlement: boolean) =>
  unwrap(
    api.PATCH('/api/v1/conflict-occurrences/{occurrenceId}', {
      params: { path: { occurrenceId } },
      body: { includeInSettlement },
    }),
  ) as Promise<ValidationIssueDetail>

export const reviewImport = (importId: string, runId: number) =>
  unwrap(
    api.POST('/api/v1/imports/{importId}/review', { params: { path: { importId } }, body: { runId } }),
  ) as Promise<ValidationRunView>
