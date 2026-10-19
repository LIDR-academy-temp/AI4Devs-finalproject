// The fake validations API on its own, without screens (web-validations design D12). It covers only what the fake
// models between requests: transitions, superseded runs, manualChangeCount, invalidated reviews, history, the
// scripted PATCH answers and the scope. Flags and results are fixed by the fixtures, never computed.
import {
  ErrorResponse,
  ValidationIssueDetail as SharedIssueDetail,
  ValidationIssuesPage as SharedIssuesPage,
  ValidationRunView as SharedRunView,
} from '@recon/shared'
import { describe, expect, it } from 'vitest'
import type { ValidationIssueDetail, ValidationIssuesPage, ValidationRunView } from '@/features/validations/contract'
import type { UserName } from './fixtures'
import { issueTokens } from './handlers'
import { importRecord, seedImport } from './imports'
import {
  batchBlockedFixture,
  batchIssuesFixture,
  failNextValidation,
  holdNextValidation,
  issueKey,
  occurrenceKey,
  type RunFixture,
  reserveVariant,
  respondNext,
  seedValidationRun,
  validationRequests,
} from './validations'

async function call(as: UserName, method: string, path: string, body?: object) {
  const { accessToken } = issueTokens(as)
  const headers: Record<string, string> = { authorization: `Bearer ${accessToken}` }
  if (body !== undefined) headers['content-type'] = 'application/json'
  const response = await fetch(`${window.location.origin}/api/v1${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: response.status, body: await response.json() }
}

const run = (importId: string, as: UserName = 'analyst') => call(as, 'POST', `/imports/${importId}/validations`)
const current = async (importId: string) =>
  (await call('analyst', 'GET', `/imports/${importId}/validations`)).body as ValidationRunView
const issues = async (importId: string, query: string) =>
  (await call('analyst', 'GET', `/imports/${importId}/validation-issues?${query}`)).body as ValidationIssuesPage
const issue = async (issueId: number) =>
  (await call('analyst', 'GET', `/validation-issues/${issueId}`)).body as ValidationIssueDetail

/** The finding of a validation for one transaction, read through the list and the detail. */
async function findingOf(importId: string, validationCode: string, transactionIdRaw: string) {
  const page = await issues(importId, `validationCode=${validationCode}&page=1&pageSize=50`)
  const summary = page.items.find((i) => i.transactionIdRaw === transactionIdRaw)!
  return issue(summary.issueId)
}

describe('fake validations API', () => {
  it('has no run until one is started, then answers the fixture of the sample', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })

    expect(await current(importId)).toMatchObject({ importId, importStatus: 'analyzed', run: null })
    expect((await issues(importId, 'page=1&pageSize=50')).total).toBe(0)

    const started = await run(importId)
    expect(started.status).toBe(201)
    const view = started.body as ValidationRunView
    expect(view.run!.runBy.userName).toBe('analyst')
    expect(view.run!.results.map((r) => [r.validationCode, r.issueCount])).toEqual([
      ['provider_mismatch', 0],
      ['non_recorded_adjustment', 3],
      ['duplicate_in_batch', 1],
      ['status_collision_in_batch', 1],
      ['duplicate_across_batches', 1],
      ['status_collision_across_batches', 1],
      ['missing_previous_to_batch', 10],
      ['missing_in_range', 6],
    ])
    expect(view.run!.results[1]!.breakdown).toEqual({ non_recorded_adjustment: 1, status_mismatch: 2 })
    expect((await issues(importId, 'validationCode=missing_previous_to_batch&page=1&pageSize=50')).total).toBe(10)
  })

  it('answers 409 import_not_analyzed outside analyzed and validated', async () => {
    const { importId } = seedImport('batch-issues', { status: 'mapped' })
    const refused = await run(importId)
    expect(refused.status).toBe(409)
    expect(refused.body).toMatchObject({ code: 'import_not_analyzed', details: { status: 'mapped' } })
  })

  it('applies an inclusion change: the asked value, who and when, one history entry and the manual count', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    const duplicate = await findingOf(importId, 'duplicate_in_batch', '441706751475644')
    const second = duplicate.occurrences[1]!
    expect(second).toMatchObject({ defaultIncluded: false, includeInSettlement: false, editable: true })

    const changed = await call('analyst', 'PATCH', `/conflict-occurrences/${second.occurrenceId}`, {
      includeInSettlement: true,
    })
    expect(changed.status).toBe(200)
    const detail = changed.body as ValidationIssueDetail
    expect(detail.occurrences[1]).toMatchObject({ includeInSettlement: true, changedBy: { userName: 'analyst' } })
    expect(detail.occurrences[1]!.changedAt).toMatch(/Z$/)
    expect(detail.includedCount).toBe(2)
    expect(detail.history).toEqual([
      {
        at: detail.occurrences[1]!.changedAt,
        user: { userId: expect.any(Number), userName: 'analyst' },
        action: 'set_inclusion',
        occurrenceId: second.occurrenceId,
        from: false,
        to: true,
        note: null,
      },
    ])
    expect((await current(importId)).run!.manualChangeCount).toBe(1)

    const same = await call('analyst', 'PATCH', `/conflict-occurrences/${second.occurrenceId}`, {
      includeInSettlement: true,
    })
    expect(same.status).toBe(200)
    expect((same.body as ValidationIssueDetail).history).toHaveLength(1)
    expect((await current(importId)).run!.manualChangeCount).toBe(1)
  })

  it('applies a resolution with its note, and the history keeps it', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    const nra = await findingOf(importId, 'non_recorded_adjustment', '281520820250015')
    expect(nra.resolvable).toBe(true)

    const resolved = await call('analyst', 'PATCH', `/validation-issues/${nra.issueId}`, {
      resolutionStatus: 'resolved',
      note: 'Checked in the gateway',
    })
    expect(resolved.status).toBe(200)
    expect(resolved.body).toMatchObject({
      resolutionStatus: 'resolved',
      resolvedBy: { userName: 'analyst' },
      resolutionNote: 'Checked in the gateway',
      resolvable: false,
      history: [{ action: 'resolve', user: { userName: 'analyst' }, note: 'Checked in the gateway' }],
    })
    expect((await current(importId)).run!.manualChangeCount).toBe(1)
  })

  it('answers a scripted 409 with its code and details and changes nothing', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId, reserveVariant())
    const reserve = await findingOf(importId, 'duplicate_in_batch', '357030499063804')
    const blocked = reserve.occurrences[1]!
    expect(blocked).toMatchObject({ editable: true, includable: false, includeInSettlement: false })

    const refused = await call('analyst', 'PATCH', `/conflict-occurrences/${blocked.occurrenceId}`, {
      includeInSettlement: true,
    })
    expect(refused.status).toBe(409)
    expect(refused.body).toMatchObject({
      code: 'occurrence_not_includable',
      details: { reason: 'reserve_already_included' },
    })
    const after = await issue(reserve.issueId)
    expect(after.occurrences[1]!.includeInSettlement).toBe(false)
    expect(after.history).toEqual([])
    expect((await current(importId)).run!.manualChangeCount).toBe(0)
  })

  it('scripts a PATCH by the stable key of the finding or the occurrence', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId, undefined, {
      patches: {
        [occurrenceKey(issueKey('duplicate_across_batches', '504712738863260'), 1)]: {
          error: { status: 409, code: 'occurrence_not_editable', details: { sourceType: 'previous_batch' } },
        },
        [issueKey('non_recorded_adjustment', '281520820250015')]: {
          error: { status: 409, code: 'issue_already_resolved', details: { resolvedAt: '2026-11-02T15:00:00.000Z' } },
        },
      },
    })
    const across = await findingOf(importId, 'duplicate_across_batches', '504712738863260')
    const historic = across.occurrences.find((o) => o.sourceType === 'previous_batch')!
    const notEditable = await call('analyst', 'PATCH', `/conflict-occurrences/${historic.occurrenceId}`, {
      includeInSettlement: true,
    })
    expect(notEditable.body).toMatchObject({
      code: 'occurrence_not_editable',
      details: { sourceType: 'previous_batch' },
    })

    const nra = await findingOf(importId, 'non_recorded_adjustment', '281520820250015')
    const already = await call('analyst', 'PATCH', `/validation-issues/${nra.issueId}`, {
      resolutionStatus: 'resolved',
      note: 'x',
    })
    expect(already.status).toBe(409)
    expect(already.body.code).toBe('issue_already_resolved')
  })

  it('moves the import analyzed ↔ validated and records the invalidated review', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const first = ((await run(importId)).body as ValidationRunView).run!

    const reviewed = await call('analyst', 'POST', `/imports/${importId}/review`, { runId: first.runId })
    expect(reviewed.status).toBe(200)
    expect(reviewed.body).toMatchObject({
      importStatus: 'validated',
      run: { review: { reviewedBy: { userName: 'analyst' } } },
    })
    expect(importRecord(importId).status).toBe('validated')

    const duplicate = await findingOf(importId, 'duplicate_in_batch', '441706751475644')
    const changed = await call('analyst', 'PATCH', `/conflict-occurrences/${duplicate.occurrences[1]!.occurrenceId}`, {
      includeInSettlement: true,
    })
    expect(changed.body.importStatus).toBe('analyzed')
    expect(importRecord(importId).status).toBe('analyzed')
    const afterChange = await current(importId)
    expect(afterChange.run!.review).toBeNull()
    expect(afterChange.lastInvalidatedReview).toMatchObject({
      runId: first.runId,
      reviewedBy: { userName: 'analyst' },
      invalidatedBy: { userName: 'analyst' },
      reason: 'inclusion_change',
      newRunId: null,
      occurrenceId: duplicate.occurrences[1]!.occurrenceId,
    })

    await call('analyst', 'POST', `/imports/${importId}/review`, { runId: first.runId })
    const rerun = await run(importId)
    expect(rerun.status).toBe(201)
    const view = rerun.body as ValidationRunView
    expect(view.importStatus).toBe('analyzed')
    expect(view.run!.runId).not.toBe(first.runId)
    expect(view.run!.manualChangeCount).toBe(0)
    expect(view.lastInvalidatedReview).toMatchObject({ runId: first.runId, reason: 'rerun', newRunId: view.run!.runId })
    expect(importRecord(importId).status).toBe('analyzed')
  })

  it('keeps the superseded run as history and refuses to review it', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const first = ((await run(importId)).body as ValidationRunView).run!
    const old = await findingOf(importId, 'duplicate_in_batch', '441706751475644')
    const second = ((await run(importId)).body as ValidationRunView).run!

    expect((await issue(old.issueId)).run).toEqual({ runId: first.runId, isCurrent: false })
    const refused = await call('analyst', 'POST', `/imports/${importId}/review`, { runId: first.runId })
    expect(refused.status).toBe(409)
    expect(refused.body).toMatchObject({
      code: 'validation_run_superseded',
      details: { runId: first.runId, currentRunId: second.runId },
    })
    const stale = await call('analyst', 'PATCH', `/conflict-occurrences/${old.occurrences[1]!.occurrenceId}`, {
      includeInSettlement: true,
    })
    expect(stale.body).toMatchObject({ code: 'validation_run_superseded', details: { currentRunId: second.runId } })
  })

  it('refuses to review a blocked run with the blocking findings', async () => {
    const { importId } = seedImport('batch-blocked', { status: 'analyzed' })
    const view = ((await run(importId)).body as ValidationRunView).run!
    expect(view.blocked).toBe(true)
    const blocking = await issues(importId, 'validationCode=provider_mismatch&page=1&pageSize=50')

    const refused = await call('analyst', 'POST', `/imports/${importId}/review`, { runId: view.runId })
    expect(refused.status).toBe(409)
    expect(refused.body).toMatchObject({
      code: 'blocking_validation_issue',
      details: { runId: view.runId, validationCodes: ['provider_mismatch'], issueIds: [blocking.items[0]!.issueId] },
    })
    expect(importRecord(importId).status).toBe('analyzed')
  })

  it('answers 403 to viewer on every write and 404 on an import of another merchant', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const seeded = seedValidationRun(importId)
    const foreign = seedImport('legacy-provider', { account: 'ProviderC-Alt', status: 'analyzed' })
    const duplicate = await findingOf(importId, 'duplicate_in_batch', '441706751475644')

    expect((await run(importId, 'viewer')).status).toBe(403)
    expect((await call('viewer', 'POST', `/imports/${importId}/review`, { runId: seeded.runId })).status).toBe(403)
    expect(
      (
        await call('viewer', 'PATCH', `/conflict-occurrences/${duplicate.occurrences[1]!.occurrenceId}`, {
          includeInSettlement: true,
        })
      ).status,
    ).toBe(403)
    expect(
      (
        await call('viewer', 'PATCH', `/validation-issues/${duplicate.issueId}`, {
          resolutionStatus: 'resolved',
          note: 'x',
        })
      ).status,
    ).toBe(403)
    expect((await call('viewer', 'GET', `/imports/${importId}/validations`)).status).toBe(200)

    const hidden = await call('viewer', 'GET', `/imports/${foreign.importId}/validations`)
    expect(hidden.status).toBe(404)
    expect(hidden.body.code).toBe('not_found')
  })

  it('holds, fails or answers a scripted error on the next request of a route', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })

    respondNext('run', { status: 409, code: 'import_changed', details: { status: 'analyzed' } })
    const changed = await run(importId)
    expect(changed.status).toBe(409)
    expect(changed.body.code).toBe('import_changed')
    expect((await current(importId)).run).toBeNull()

    failNextValidation('run')
    await expect(run(importId)).rejects.toThrow()

    const hold = holdNextValidation('run')
    let settled = false
    const pending = run(importId).then((r) => {
      settled = true
      return r
    })
    await hold.arrived
    expect(settled).toBe(false)
    hold.release()
    expect((await pending).status).toBe(201)
    expect(validationRequests('run').map((r) => r.status)).toEqual([409, null, 201])
  })
})

describe('fake validations API against the shared schemas of #9 (design D13)', () => {
  /** Every answer the screens read, for a run built from `fixture`, checked with the schemas the backend uses. */
  async function expectConformant(importId: string, fixture?: RunFixture) {
    seedValidationRun(importId, fixture)
    const view = SharedRunView.safeParse(await current(importId))
    expect(view.error?.issues ?? []).toEqual([])
    const page = await call('analyst', 'GET', `/imports/${importId}/validation-issues?page=1&pageSize=500`)
    const parsed = SharedIssuesPage.safeParse(page.body)
    expect(parsed.error?.issues ?? []).toEqual([])
    for (const summary of (page.body as ValidationIssuesPage).items) {
      const detail = SharedIssueDetail.safeParse(await issue(summary.issueId))
      expect(detail.error?.issues ?? [], `finding ${summary.issueId}`).toEqual([])
    }
  }

  it('batch-issues', async () => {
    await expectConformant(seedImport('batch-issues', { status: 'analyzed' }).importId, batchIssuesFixture())
  })

  it('batch-blocked', async () => {
    await expectConformant(seedImport('batch-blocked', { status: 'analyzed' }).importId, batchBlockedFixture())
  })

  it('the reserve variant', async () => {
    await expectConformant(seedImport('batch-issues', { status: 'analyzed' }).importId, reserveVariant())
  })

  it('a run without findings', async () => {
    await expectConformant(seedImport('batch-clean', { status: 'analyzed' }).importId)
  })

  it('answers 400 validation_error to a page above 10 000 and to an occurrence id beyond BIGINT', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)

    const page = await call('analyst', 'GET', `/imports/${importId}/validation-issues?page=10001&pageSize=50`)
    expect(page.status).toBe(400)
    expect(page.body.code).toBe('validation_error')
    expect((await call('analyst', 'GET', `/imports/${importId}/validation-issues?page=10000`)).status).toBe(200)

    const beyond = await call('analyst', 'PATCH', '/conflict-occurrences/9223372036854775808', {
      includeInSettlement: true,
    })
    expect(beyond.status).toBe(400)
    expect(beyond.body.code).toBe('validation_error')
  })

  it('every answer of a whole flow and every error body it returns', async () => {
    const conforms = (schema: { safeParse: (v: unknown) => { error?: { issues: unknown[] } } }, body: unknown) =>
      expect(schema.safeParse(body).error?.issues ?? []).toEqual([])
    /** An error body as #9 sends it: lowercase snake_case code, message and optional details. */
    const isError = (body: unknown, code: string) => {
      conforms(ErrorResponse, body)
      expect((body as { code: string }).code).toBe(code)
      expect(code).toMatch(/^[a-z]+(_[a-z]+)*$/)
    }

    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const first = await run(importId)
    expect(first.status).toBe(201)
    conforms(SharedRunView, first.body)
    const firstRun = (first.body as ValidationRunView).run!

    const duplicate = await findingOf(importId, 'duplicate_in_batch', '441706751475644')
    const included = await call('analyst', 'PATCH', `/conflict-occurrences/${duplicate.occurrences[1]!.occurrenceId}`, {
      includeInSettlement: true,
    })
    expect(included.status).toBe(200)
    conforms(SharedIssueDetail, included.body)

    const nra = await findingOf(importId, 'non_recorded_adjustment', '281520820250015')
    const resolved = await call('analyst', 'PATCH', `/validation-issues/${nra.issueId}`, {
      resolutionStatus: 'resolved',
      note: 'Checked in the gateway',
    })
    expect(resolved.status).toBe(200)
    conforms(SharedIssueDetail, resolved.body)

    const reviewed = await call('analyst', 'POST', `/imports/${importId}/review`, { runId: firstRun.runId })
    expect(reviewed.status).toBe(200)
    conforms(SharedRunView, reviewed.body)

    const again = await run(importId)
    expect(again.status).toBe(201)
    conforms(SharedRunView, again.body)
    expect((again.body as ValidationRunView).lastInvalidatedReview).not.toBeNull()

    const old = await call('analyst', 'GET', `/validation-issues/${duplicate.issueId}`)
    conforms(SharedIssueDetail, old.body)
    expect((old.body as ValidationIssueDetail).run.isCurrent).toBe(false)

    // The error bodies the fake answers in that state.
    isError(
      (await call('analyst', 'POST', `/imports/${importId}/review`, { runId: firstRun.runId })).body,
      'validation_run_superseded',
    )
    isError(
      (
        await call('analyst', 'PATCH', `/conflict-occurrences/${duplicate.occurrences[1]!.occurrenceId}`, {
          includeInSettlement: false,
        })
      ).body,
      'validation_run_superseded',
    )
    isError(
      (await call('analyst', 'PATCH', `/validation-issues/${nra.issueId}`, { resolutionStatus: 'resolved', note: 'x' }))
        .body,
      'validation_run_superseded',
    )
    const mapped = seedImport('batch-issues', { status: 'mapped' })
    isError((await run(mapped.importId)).body, 'import_not_analyzed')
    isError(
      (await call('analyst', 'POST', `/imports/${mapped.importId}/review`, { runId: 1 })).body,
      'import_not_analyzed',
    )
    const unrun = seedImport('batch-issues', { status: 'analyzed' })
    isError(
      (await call('analyst', 'POST', `/imports/${unrun.importId}/review`, { runId: 1 })).body,
      'validation_run_required',
    )
    const cancelled = seedImport('batch-issues', { status: 'analyzed' })
    const cancelledRun = seedValidationRun(cancelled.importId)
    importRecord(cancelled.importId).status = 'cancelled'
    const occurrence = cancelledRun.issues.find((i) => i.occurrences.length > 0)!.occurrences[0]!
    isError(
      (
        await call('analyst', 'PATCH', `/conflict-occurrences/${occurrence.occurrenceId}`, {
          includeInSettlement: false,
        })
      ).body,
      'import_not_editable',
    )
    const blocked = seedImport('batch-blocked', { status: 'analyzed' })
    const blockedRun = seedValidationRun(blocked.importId)
    isError(
      (await call('analyst', 'POST', `/imports/${blocked.importId}/review`, { runId: blockedRun.runId })).body,
      'blocking_validation_issue',
    )
    // Scripted errors keep the shape too, a 422 among them.
    const scripted = seedImport('batch-issues', { status: 'analyzed' })
    const scriptedRun = seedValidationRun(scripted.importId, undefined, {
      patches: {
        [issueKey('non_recorded_adjustment', '281520820250015')]: {
          error: { status: 422, code: 'issue_not_resolvable', details: { issueType: 'non_recorded_adjustment' } },
        },
      },
    })
    const scriptedNra = scriptedRun.issues.find((i) => i.issueType === 'non_recorded_adjustment')!
    const notResolvable = await call('analyst', 'PATCH', `/validation-issues/${scriptedNra.issueId}`, {
      resolutionStatus: 'resolved',
      note: 'x',
    })
    expect(notResolvable.status).toBe(422)
    isError(notResolvable.body, 'issue_not_resolvable')
  })
})
