import { describe, expect, it } from 'vitest'
import {
  IssueHistoryEntry,
  IssueScope,
  IssueType,
  isApproved,
  MissingRange,
  MissingType,
  OccurrenceSource,
  OccurrenceView,
  ResolveIssueBody,
  ReviewBody,
  SetInclusionBody,
  ValidationIssueDetail,
  ValidationIssueSummary,
  ValidationIssuesPage,
  ValidationIssuesQuery,
  ValidationOutcome,
  ValidationRunView,
} from './validation.js'

describe('validation vocabulary (spec "Resultado derivado de los hallazgos", README §3.2)', () => {
  it('ValidationOutcome has passed, warning, blocked, not_applicable and not_implemented, and no failed', () => {
    expect(ValidationOutcome.options).toEqual(['passed', 'warning', 'blocked', 'not_applicable', 'not_implemented'])
    expect(ValidationOutcome.safeParse('failed').success).toBe(false)
  })

  it('IssueType includes status_mismatch (business decision 2)', () => {
    expect(IssueType.options).toEqual([
      'provider_mismatch',
      'non_recorded_adjustment',
      'status_mismatch',
      'duplicate',
      'collision',
      'missing',
    ])
  })

  it('IssueScope, OccurrenceSource, MissingType and MissingRange are the closed lists of §3.2', () => {
    expect(IssueScope.options).toEqual(['in_batch', 'across_batches', 'previous_to_batch', 'in_range'])
    expect(OccurrenceSource.options).toEqual(['current_import', 'previous_batch'])
    expect(MissingType.options).toEqual(['previous_to_batch', 'in_range'])
    expect(MissingRange.options).toEqual(['APP', 'DEC', 'I', 'R'])
    expect(IssueScope.safeParse('persistent').success).toBe(false)
  })

  it('isApproved is true only for passed and warning', () => {
    expect(ValidationOutcome.options.filter(isApproved)).toEqual(['passed', 'warning'])
  })
})

// Contract of validation-runs ("Contrato para #10" in its design): runs, findings, occurrences and the review.
const IMPORT_ID = '7b0c2a52-3f8e-4d0a-9a61-0d8f3b1e2c44'
const FILE_ID = '1f0c2a52-3f8e-4d0a-9a61-0d8f3b1e2c01'
const SHEET_ID = '2f0c2a52-3f8e-4d0a-9a61-0d8f3b1e2c02'
const ANALYST = { userId: 2, userName: 'analyst' }
const SUCCESSFUL = { statusId: 2, code: 'Successful', name: 'Successful' }

const result = (validationCode: string, outcome: string, issueCount: number, breakdown: unknown = null) => ({
  validationCode,
  outcome,
  issueCount,
  blocking: outcome === 'blocked',
  approved: outcome === 'passed' || outcome === 'warning',
  breakdown,
})

/** The GET validations example of the design (MSW). */
const runViewExample = {
  importId: IMPORT_ID,
  importStatus: 'analyzed',
  run: {
    runId: 12,
    runAt: '2026-10-18T10:15:30.123Z',
    runBy: ANALYST,
    blocked: false,
    ranges: {
      APP: { min: '2026-09-28T00:00:00.000Z', max: '2026-10-07T23:59:59.000Z' },
      DEC: { min: '2026-09-29T00:00:00.000Z', max: '2026-10-07T23:59:59.000Z' },
      I: { min: '2026-09-28T00:00:00.000Z', max: '2026-10-11T00:00:00.000Z' },
      R: { min: '2026-03-31T00:00:00.000Z', max: '2026-04-09T00:00:00.000Z' },
    },
    pendingInRangeCount: 0,
    undatedAdjustmentCount: 1,
    undatedCandidateCount: 0,
    results: [
      result('provider_mismatch', 'passed', 0),
      result('non_recorded_adjustment', 'warning', 3, { non_recorded_adjustment: 1, status_mismatch: 2 }),
      result('duplicate_in_batch', 'warning', 1),
      result('status_collision_in_batch', 'warning', 1),
      result('duplicate_across_batches', 'warning', 1),
      result('status_collision_across_batches', 'warning', 1),
      result('missing_previous_to_batch', 'warning', 10, { APP: 0, DEC: 10, I: 0, R: 0 }),
      result('missing_in_range', 'warning', 6, { APP: 3, DEC: 0, I: 0, R: 3 }),
    ],
    manualChangeCount: 0,
    review: null,
  },
  lastInvalidatedReview: {
    runId: 11,
    reviewedBy: ANALYST,
    reviewedAt: '2026-10-18T10:02:11.000Z',
    invalidatedBy: ANALYST,
    invalidatedAt: '2026-10-18T10:15:30.123Z',
    reason: 'rerun',
    newRunId: 12,
    occurrenceId: null,
  },
}

const location = (rowNo: number) => ({
  fileId: FILE_ID,
  fileName: 'batch-issues.xlsx',
  sheetId: SHEET_ID,
  sheetName: 'APP',
  rowNo,
})

const occurrenceExample = {
  occurrenceId: '4402',
  sourceType: 'current_import',
  location: location(233),
  batch: null,
  status: SUCCESSFUL,
  excludeAmount: false,
  defaultIncluded: false,
  includeInSettlement: true,
  changedBy: ANALYST,
  changedAt: '2026-10-18T10:20:01.456Z',
  editable: true,
  includable: true,
}

const summaryExample = {
  issueId: 881,
  runId: 12,
  validationCode: 'duplicate_in_batch',
  issueType: 'duplicate',
  scope: 'in_batch',
  blocking: false,
  transactionIdRaw: '441706751475644',
  transactionId: '100234',
  cycle: 'E',
  missingType: null,
  missingRange: null,
  relevantDate: null,
  status: SUCCESSFUL,
  gatewayStatus: null,
  source: null,
  resolutionStatus: 'persistent',
  resolvedAt: null,
  resolvedBy: null,
  resolutionNote: null,
  occurrenceCount: 2,
  includedByDefaultCount: 1,
  includedCount: 2,
}

/** The PATCH conflict-occurrences example of the design (MSW); the ids it elides are filled in. */
const detailExample = {
  ...summaryExample,
  importId: IMPORT_ID,
  importStatus: 'analyzed',
  run: { runId: 12, isCurrent: true },
  resolvable: false,
  occurrences: [
    {
      ...occurrenceExample,
      occurrenceId: '4401',
      location: location(14),
      defaultIncluded: true,
      changedBy: null,
      changedAt: null,
    },
    occurrenceExample,
  ],
  history: [
    {
      at: '2026-10-18T10:20:01.456Z',
      user: ANALYST,
      action: 'set_inclusion',
      occurrenceId: '4402',
      from: false,
      to: true,
      note: null,
    },
  ],
}

describe('ValidationRunView', () => {
  it('accepts the GET validations example of the design', () => {
    expect(ValidationRunView.safeParse(runViewExample).success).toBe(true)
  })

  it('accepts an import without a run and without an invalidated review', () => {
    const empty = { importId: IMPORT_ID, importStatus: 'analyzed', run: null, lastInvalidatedReview: null }
    expect(ValidationRunView.safeParse(empty).success).toBe(true)
  })

  it('takes a valid review of the current run and an invalidation by inclusion change', () => {
    const view = {
      ...runViewExample,
      importStatus: 'validated',
      run: {
        ...runViewExample.run,
        manualChangeCount: 2,
        review: { reviewedBy: ANALYST, reviewedAt: '2026-10-18T10:30:00.000Z' },
      },
      lastInvalidatedReview: {
        ...runViewExample.lastInvalidatedReview,
        reason: 'inclusion_change',
        newRunId: null,
        occurrenceId: '4402',
      },
    }
    expect(ValidationRunView.safeParse(view).success).toBe(true)
  })

  it('rejects a run without eight results, an unknown invalidation reason and a negative manualChangeCount', () => {
    const run = runViewExample.run
    const invalidated = runViewExample.lastInvalidatedReview
    expect(
      ValidationRunView.safeParse({ ...runViewExample, run: { ...run, results: run.results.slice(1) } }).success,
    ).toBe(false)
    expect(
      ValidationRunView.safeParse({ ...runViewExample, lastInvalidatedReview: { ...invalidated, reason: 'manual' } })
        .success,
    ).toBe(false)
    expect(ValidationRunView.safeParse({ ...runViewExample, run: { ...run, manualChangeCount: -1 } }).success).toBe(
      false,
    )
  })
})

describe('ValidationIssuesQuery', () => {
  it('defaults to page 1 of 50 and takes every filter', () => {
    expect(ValidationIssuesQuery.parse({})).toEqual({ page: 1, pageSize: 50 })
    expect(
      ValidationIssuesQuery.parse({
        type: 'duplicate',
        scope: 'in_batch',
        status: 'persistent',
        validationCode: 'duplicate_in_batch',
        cycle: 'E',
        page: '2',
        pageSize: '500',
      }),
    ).toEqual({
      type: 'duplicate',
      scope: 'in_batch',
      status: 'persistent',
      validationCode: 'duplicate_in_batch',
      cycle: 'E',
      page: 2,
      pageSize: 500,
    })
  })

  it('rejects pageSize above 500 and an unknown type', () => {
    expect(ValidationIssuesQuery.safeParse({ pageSize: '501' }).success).toBe(false)
    expect(ValidationIssuesQuery.safeParse({ type: 'failed' }).success).toBe(false)
  })

  it('caps page at 10 000 (5 000 000 findings at 500 per page): beyond it, rejected', () => {
    expect(ValidationIssuesQuery.safeParse({ page: '10000' }).success).toBe(true)
    expect(ValidationIssuesQuery.safeParse({ page: '10001' }).success).toBe(false)
    expect(ValidationIssuesQuery.safeParse({ page: '999999999999' }).success).toBe(false)
  })
})

describe('ValidationIssueSummary, ValidationIssueDetail and the page', () => {
  it('accepts the summary and the PATCH conflict-occurrences example of the design', () => {
    expect(ValidationIssueSummary.safeParse(summaryExample).success).toBe(true)
    expect(ValidationIssueDetail.safeParse(detailExample).success).toBe(true)
    const page = { items: [summaryExample], page: 1, pageSize: 50, total: 1 }
    expect(ValidationIssuesPage.safeParse(page).success).toBe(true)
  })

  it('accepts a missing finding with its range and a one-row finding with its source and gateway status', () => {
    const missing = {
      ...summaryExample,
      validationCode: 'missing_in_range',
      issueType: 'missing',
      scope: 'in_range',
      missingType: 'in_range',
      missingRange: 'APP',
      relevantDate: '2026-10-01T00:00:00.000Z',
      occurrenceCount: 0,
      includedByDefaultCount: 0,
      includedCount: 0,
    }
    const nra = {
      ...summaryExample,
      validationCode: 'non_recorded_adjustment',
      issueType: 'non_recorded_adjustment',
      scope: null,
      cycle: 'I',
      gatewayStatus: SUCCESSFUL,
      source: location(4),
      resolutionStatus: 'resolved',
      resolvedAt: '2026-10-18T10:25:00.000Z',
      resolvedBy: ANALYST,
      resolutionNote: 'Verified in the gateway',
    }
    expect(ValidationIssueSummary.safeParse(missing).success).toBe(true)
    expect(ValidationIssueSummary.safeParse(nra).success).toBe(true)
  })

  it('rejects a transactionId sent as a number and an unknown resolution status', () => {
    expect(ValidationIssueSummary.safeParse({ ...summaryExample, transactionId: 100234 }).success).toBe(false)
    expect(ValidationIssueSummary.safeParse({ ...summaryExample, resolutionStatus: 'ignored' }).success).toBe(false)
  })
})

describe('OccurrenceView', () => {
  it('accepts a historical occurrence with its batch and without a row', () => {
    const historical = {
      ...occurrenceExample,
      occurrenceId: '4403',
      sourceType: 'previous_batch',
      location: null,
      batch: {
        batchId: '3f0c2a52-3f8e-4d0a-9a61-0d8f3b1e2c03',
        batchNo: 51,
        attemptNo: 1,
        status: 'paid',
        accountId: '4f0c2a52-3f8e-4d0a-9a61-0d8f3b1e2c04',
        accountName: 'ProviderB-Main',
      },
      status: null,
      defaultIncluded: true,
      includeInSettlement: true,
      changedBy: null,
      changedAt: null,
      editable: false,
      includable: false,
    }
    expect(OccurrenceView.safeParse(historical).success).toBe(true)
  })

  it('takes occurrenceId only as a string of digits, and requires editable and includable', () => {
    expect(OccurrenceView.safeParse({ ...occurrenceExample, occurrenceId: 4402 }).success).toBe(false)
    expect(OccurrenceView.safeParse({ ...occurrenceExample, occurrenceId: '44a2' }).success).toBe(false)
    const { editable: _editable, ...withoutEditable } = occurrenceExample
    const { includable: _includable, ...withoutIncludable } = occurrenceExample
    expect(OccurrenceView.safeParse(withoutEditable).success).toBe(false)
    expect(OccurrenceView.safeParse(withoutIncludable).success).toBe(false)
  })
})

describe('IssueHistoryEntry', () => {
  it('accepts a set_inclusion and a resolve entry, and rejects another action', () => {
    expect(IssueHistoryEntry.safeParse(detailExample.history[0]).success).toBe(true)
    const resolve = {
      at: '2026-10-18T10:25:00.000Z',
      user: ANALYST,
      action: 'resolve',
      occurrenceId: null,
      from: null,
      to: null,
      note: 'Verified in the gateway',
    }
    expect(IssueHistoryEntry.safeParse(resolve).success).toBe(true)
    expect(IssueHistoryEntry.safeParse({ ...resolve, action: 'review' }).success).toBe(false)
  })
})

describe('request bodies', () => {
  it('SetInclusionBody takes a boolean and nothing else', () => {
    expect(SetInclusionBody.safeParse({ includeInSettlement: true }).success).toBe(true)
    expect(SetInclusionBody.safeParse({ includeInSettlement: 'yes' }).success).toBe(false)
    expect(SetInclusionBody.safeParse({ includeInSettlement: true, note: 'x' }).success).toBe(false)
  })

  it('ResolveIssueBody takes resolved with a trimmed note of 1 to 500 characters, strictly', () => {
    expect(ResolveIssueBody.parse({ resolutionStatus: 'resolved', note: '  Verified in the gateway  ' })).toEqual({
      resolutionStatus: 'resolved',
      note: 'Verified in the gateway',
    })
    expect(ResolveIssueBody.safeParse({ resolutionStatus: 'resolved', note: 'x'.repeat(500) }).success).toBe(true)
    expect(ResolveIssueBody.safeParse({ resolutionStatus: 'resolved', note: '' }).success).toBe(false)
    expect(ResolveIssueBody.safeParse({ resolutionStatus: 'resolved', note: '   ' }).success).toBe(false)
    expect(ResolveIssueBody.safeParse({ resolutionStatus: 'resolved', note: 'x'.repeat(501) }).success).toBe(false)
    expect(ResolveIssueBody.safeParse({ resolutionStatus: 'persistent', note: 'x' }).success).toBe(false)
    expect(ResolveIssueBody.safeParse({ resolutionStatus: 'resolved', note: 'x', extra: 1 }).success).toBe(false)
  })

  it('ReviewBody takes a positive integer runId, strictly', () => {
    expect(ReviewBody.safeParse({ runId: 7 }).success).toBe(true)
    expect(ReviewBody.safeParse({}).success).toBe(false)
    expect(ReviewBody.safeParse({ runId: 0 }).success).toBe(false)
    expect(ReviewBody.safeParse({ runId: 1.5 }).success).toBe(false)
    expect(ReviewBody.safeParse({ runId: '7' }).success).toBe(false)
    expect(ReviewBody.safeParse({ runId: 7, decision: 'cancel' }).success).toBe(false)
  })
})
