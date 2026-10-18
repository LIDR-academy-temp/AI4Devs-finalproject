// TEMPORARY until #9 (validation-runs) is merged: the "Contract for #10" of its design, copied by hand, and the only
// place that knows the validation routes (web-validations design D2). The rebase replaces these types with aliases of
// the generated ones and the calls with the typed `api` client, keeping the exported names.
import type {
  BatchStatus,
  Cycle,
  ImportStatus,
  IssueScope,
  IssueType,
  MissingRange,
  MissingType,
  OccurrenceSource,
  TransactionStatusCode,
  ValidationCode,
  ValidationOutcome,
} from '@recon/shared'
import { ApiError } from '@/lib/api/client'
import type { AuditInstant, BusinessDate } from '@/lib/format'
import { apiOrigin } from '@/lib/session/api-origin'
import { createAuthFetch } from '@/lib/session/auth-fetch'
import { session } from '@/lib/session/session'

export type { AuditInstant, BusinessDate }

export interface UserRef {
  userId: number
  userName: string
}

export interface StatusRef {
  statusId: number
  code: TransactionStatusCode
  name: string
}

/** Inclusive range of business dates. */
export interface DateRange {
  min: BusinessDate
  max: BusinessDate
}

export interface ValidationResultView {
  validationCode: ValidationCode
  outcome: ValidationOutcome
  issueCount: number
  /** outcome === 'blocked' */
  blocking: boolean
  /** outcome is passed or warning */
  approved: boolean
  /** missing_*: { APP, DEC, I, R }; non_recorded_adjustment: { non_recorded_adjustment, status_mismatch }; else null */
  breakdown: Record<string, number> | null
}

export interface RunReview {
  reviewedBy: UserRef
  reviewedAt: AuditInstant
}

export interface ValidationRun {
  runId: number
  runAt: AuditInstant
  runBy: UserRef
  blocked: boolean
  ranges: Record<MissingRange, DateRange | null>
  pendingInRangeCount: number
  undatedAdjustmentCount: number
  undatedCandidateCount: number
  /** Always 8, in the fixed order of the API. */
  results: ValidationResultView[]
  /** Occurrences with includeInSettlement !== defaultIncluded + findings resolved by hand; lost on re-run. */
  manualChangeCount: number
  /** Review of this run, while it is valid. */
  review: RunReview | null
}

export interface InvalidatedReview {
  /** The run that had been reviewed. */
  runId: number
  reviewedBy: UserRef
  reviewedAt: AuditInstant
  invalidatedBy: UserRef
  invalidatedAt: AuditInstant
  reason: 'rerun' | 'inclusion_change'
  /** rerun: the run that superseded it. */
  newRunId: number | null
  /** inclusion_change: the occurrence changed. */
  occurrenceId: string | null
}

export interface ValidationRunView {
  importId: string
  importStatus: ImportStatus
  run: ValidationRun | null
  /** Most recent invalidated review of the import, of any run. */
  lastInvalidatedReview: InvalidatedReview | null
}

export interface RowLocation {
  fileId: string
  fileName: string
  sheetId: string
  sheetName: string
  rowNo: number
}

export interface ValidationIssueSummary {
  issueId: number
  runId: number
  validationCode: ValidationCode
  issueType: IssueType
  scope: IssueScope | null
  blocking: boolean
  transactionIdRaw: string | null
  /** BIGINT as string */
  transactionId: string | null
  cycle: Cycle | null
  missingType: MissingType | null
  missingRange: MissingRange | null
  relevantDate: BusinessDate | null
  /** Reported (or expected, for missing). */
  status: StatusRef | null
  /** Only non_recorded_adjustment / status_mismatch. */
  gatewayStatus: StatusRef | null
  /** One-row findings: provider_mismatch, non_recorded_adjustment, status_mismatch. */
  source: RowLocation | null
  resolutionStatus: 'persistent' | 'resolved'
  resolvedAt: AuditInstant | null
  resolvedBy: UserRef | null
  resolutionNote: string | null
  occurrenceCount: number
  includedByDefaultCount: number
  includedCount: number
}

export interface OccurrenceBatch {
  batchId: string
  batchNo: number
  attemptNo: number
  status: BatchStatus
  accountId: string
  accountName: string
}

export interface OccurrenceView {
  /** BIGINT as string */
  occurrenceId: string
  sourceType: OccurrenceSource
  /** null for a historical movement without a row */
  location: RowLocation | null
  batch: OccurrenceBatch | null
  /** null: the row status could not be resolved */
  status: StatusRef | null
  /** CHB 2 */
  excludeAmount: boolean
  defaultIncluded: boolean
  includeInSettlement: boolean
  /** Last change. */
  changedBy: UserRef | null
  changedAt: AuditInstant | null
  /** Can be changed now (excluding is always possible when editable). */
  editable: boolean
  /** Editable and not blocked by the R rule. */
  includable: boolean
}

export interface IssueHistoryEntry {
  at: AuditInstant
  user: UserRef
  action: 'set_inclusion' | 'resolve'
  occurrenceId: string | null
  from: boolean | null
  to: boolean | null
  note: string | null
}

export interface ValidationIssueDetail extends ValidationIssueSummary {
  importId: string
  importStatus: ImportStatus
  run: { runId: number; isCurrent: boolean }
  resolvable: boolean
  /** current_import first (first-occurrence order), then previous_batch (history order). */
  occurrences: OccurrenceView[]
  /** Oldest first. */
  history: IssueHistoryEntry[]
}

export interface ValidationIssuesPage {
  items: ValidationIssueSummary[]
  page: number
  pageSize: number
  total: number
}

export interface ValidationIssuesQuery {
  type?: IssueType
  scope?: IssueScope
  status?: 'persistent' | 'resolved'
  validationCode?: ValidationCode
  cycle?: Cycle
  page?: number
  pageSize?: number
}

export interface ResolveIssueBody {
  resolutionStatus: 'resolved'
  note: string
}

export interface InclusionBody {
  includeInSettlement: boolean
}

export interface ReviewBody {
  runId: number
}

/** `details` of the errors the screen reads. */
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

const authFetch = createAuthFetch(session)

/** One request to the API; the body of a 2xx answer, typed with the contract, or ApiError. */
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await authFetch(
    new Request(`${apiOrigin()}/api/v1${path}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  )
  const payload: unknown = await response.json().catch(() => undefined)
  if (response.ok) return payload as T
  const error = (payload ?? {}) as { code?: string; message?: string; details?: unknown }
  throw new ApiError(response.status, error.code, error.message ?? `HTTP ${response.status}`, error.details)
}

function queryString(query: ValidationIssuesQuery): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) if (value !== undefined) params.set(key, String(value))
  return params.toString()
}

export const getValidationRun = (importId: string) =>
  request<ValidationRunView>('GET', `/imports/${importId}/validations`)

export const runValidations = (importId: string) =>
  request<ValidationRunView>('POST', `/imports/${importId}/validations`)

export const listValidationIssues = (importId: string, query: ValidationIssuesQuery) =>
  request<ValidationIssuesPage>('GET', `/imports/${importId}/validation-issues?${queryString(query)}`)

export const getValidationIssue = (issueId: number) =>
  request<ValidationIssueDetail>('GET', `/validation-issues/${issueId}`)

export const resolveIssue = (issueId: number, note: string) =>
  request<ValidationIssueDetail>('PATCH', `/validation-issues/${issueId}`, {
    resolutionStatus: 'resolved',
    note,
  } satisfies ResolveIssueBody)

export const setOccurrenceInclusion = (occurrenceId: string, includeInSettlement: boolean) =>
  request<ValidationIssueDetail>('PATCH', `/conflict-occurrences/${occurrenceId}`, {
    includeInSettlement,
  } satisfies InclusionBody)

export const reviewImport = (importId: string, runId: number) =>
  request<ValidationRunView>('POST', `/imports/${importId}/review`, { runId } satisfies ReviewBody)
