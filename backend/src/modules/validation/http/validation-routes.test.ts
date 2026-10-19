import { ErrorResponse, ValidationIssueDetail, ValidationIssuesPage, ValidationRunView } from '@recon/shared'
import type { InjectOptions } from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildTestApp, PASSWORD } from '../../../test-support/build-test-app.js'
import { InMemoryRunRepository } from '../application/__fakes__/in-memory-runs.js'
import { ValidationService } from '../application/validation-service.js'
import { sampleInput } from '../test-support/sample-input.js'

// The validation routes over the service on doubles (validation-runs design D14): status codes, error codes and the
// shape of every body checked with the shared schemas.
const UNKNOWN_UUID = '00000000-0000-4000-8000-00000000ffff'
/** The sample inputs number their imports from the same sequence: the foreign import gets an id of its own. */
const FOREIGN_IMPORT_ID = '00000000-0000-4000-8000-0000000f0002'

let ctx: Awaited<ReturnType<typeof buildTestApp>>
let runs: InMemoryRunRepository
let importId: string

beforeEach(async () => {
  const issues = await sampleInput('batch-issues')
  runs = new InMemoryRunRepository()
  importId = issues.importId
  runs.addImport({ importId, merchantId: 1, status: 'analyzed' })
  // ProviderC-Alt belongs to merchant 2: outside the viewer's scope.
  runs.addImport({ importId: FOREIGN_IMPORT_ID, merchantId: 2, status: 'analyzed' })
  runs.describeImport(issues.imports.stored(importId))
  const service = new ValidationService({ sources: issues.sources, runs, log: { info: vi.fn() } })
  ctx = await buildTestApp({ validation: { service } })
  await ctx.app.ready()
})

afterEach(async () => {
  await ctx.app.close()
})

async function tokenOf(userName: string): Promise<string> {
  const { accessToken } = await ctx.authService.login({ userName, password: PASSWORD })
  return accessToken
}

type Method = 'GET' | 'POST' | 'PATCH'

async function request(method: Method, url: string, options: { body?: object; user?: string | null } = {}) {
  const user = options.user === undefined ? 'analyst' : options.user
  const headers: Record<string, string> = {}
  if (user) headers.authorization = `Bearer ${await tokenOf(user)}`
  const inject: InjectOptions = { method, url: `/api/v1${url}`, headers }
  if (options.body !== undefined) inject.payload = options.body
  return ctx.app.inject(inject)
}

const errorCode = (body: unknown) => ErrorResponse.parse(body).code

describe('POST /imports/:importId/validations', () => {
  it('201 with the run view (analyst)', async () => {
    const res = await request('POST', `/imports/${importId}/validations`)

    expect(res.statusCode).toBe(201)
    const view = ValidationRunView.parse(res.json())
    expect(view.run?.results).toHaveLength(8)
    expect(view.importStatus).toBe('analyzed')
  })

  it('409 import_not_analyzed with the status', async () => {
    runs.setStatus(importId, 'mapped')

    const res = await request('POST', `/imports/${importId}/validations`)

    expect(res.statusCode).toBe(409)
    expect(res.json()).toMatchObject({ code: 'import_not_analyzed', details: { status: 'mapped' } })
  })

  it('401 without a token, 403 for viewer', async () => {
    expect((await request('POST', `/imports/${importId}/validations`, { user: null })).statusCode).toBe(401)
    const forbidden = await request('POST', `/imports/${importId}/validations`, { user: 'viewer' })
    expect(forbidden.statusCode).toBe(403)
    expect(errorCode(forbidden.json())).toBe('forbidden')
  })

  it('404 not_found for an unknown import', async () => {
    const unknown = await request('POST', `/imports/${UNKNOWN_UUID}/validations`)

    expect(unknown.statusCode).toBe(404)
    expect(unknown.json()).toMatchObject({ code: 'not_found', message: 'Import not found' })
  })

  it('400 validation_error for a malformed import id', async () => {
    const res = await request('POST', '/imports/not-a-uuid/validations')

    expect(res.statusCode).toBe(400)
    expect(errorCode(res.json())).toBe('validation_error')
  })
})

describe('GET /imports/:importId/validations', () => {
  it('200 with run null before any run, readable by viewer', async () => {
    const res = await request('GET', `/imports/${importId}/validations`, { user: 'viewer' })

    expect(res.statusCode).toBe(200)
    expect(ValidationRunView.parse(res.json())).toMatchObject({ run: null, lastInvalidatedReview: null })
  })

  it('200 with the current run after a run', async () => {
    await request('POST', `/imports/${importId}/validations`)

    const res = await request('GET', `/imports/${importId}/validations`, { user: 'viewer' })

    expect(res.statusCode).toBe(200)
    expect(ValidationRunView.parse(res.json()).run?.results).toHaveLength(8)
  })

  it('401 without a token, 404 identical for unknown and foreign, 400 for a malformed id', async () => {
    expect((await request('GET', `/imports/${importId}/validations`, { user: null })).statusCode).toBe(401)
    const unknown = await request('GET', `/imports/${UNKNOWN_UUID}/validations`, { user: 'viewer' })
    const foreign = await request('GET', `/imports/${FOREIGN_IMPORT_ID}/validations`, { user: 'viewer' })
    expect(unknown.statusCode).toBe(404)
    expect(foreign.json()).toEqual(unknown.json())
    expect((await request('GET', '/imports/abc/validations')).statusCode).toBe(400)
  })
})

describe('GET /imports/:importId/validation-issues', () => {
  it('200 with the filtered page (viewer)', async () => {
    await request('POST', `/imports/${importId}/validations`)

    const res = await request('GET', `/imports/${importId}/validation-issues?type=duplicate&scope=in_batch`, {
      user: 'viewer',
    })

    expect(res.statusCode).toBe(200)
    const page = ValidationIssuesPage.parse(res.json())
    expect(page.total).toBe(1)
    expect(page.items[0]?.occurrenceCount).toBe(2)
  })

  it('400 validation_error for type=failed and pageSize=501', async () => {
    for (const q of ['type=failed', 'pageSize=501']) {
      const res = await request('GET', `/imports/${importId}/validation-issues?${q}`)
      expect(res.statusCode, q).toBe(400)
      expect(errorCode(res.json())).toBe('validation_error')
    }
  })

  it('404 identical for unknown and foreign imports, 401 without a token', async () => {
    const unknown = await request('GET', `/imports/${UNKNOWN_UUID}/validation-issues`, { user: 'viewer' })
    const foreign = await request('GET', `/imports/${FOREIGN_IMPORT_ID}/validation-issues`, { user: 'viewer' })

    expect(unknown.statusCode).toBe(404)
    expect(foreign.json()).toEqual(unknown.json())
    expect((await request('GET', `/imports/${importId}/validation-issues`, { user: null })).statusCode).toBe(401)
  })
})

describe('GET /validation-issues/:issueId', () => {
  it('200 with the detail of a finding', async () => {
    await request('POST', `/imports/${importId}/validations`)
    const page = ValidationIssuesPage.parse(
      (await request('GET', `/imports/${importId}/validation-issues?type=collision&scope=in_batch`)).json(),
    )

    const res = await request('GET', `/validation-issues/${page.items[0]!.issueId}`, { user: 'viewer' })

    expect(res.statusCode).toBe(200)
    const detail = ValidationIssueDetail.parse(res.json())
    expect(detail.occurrences).toHaveLength(2)
    expect(detail.occurrences.every((o) => !o.editable)).toBe(true)
  })

  it('400 for issueId=abc, 404 not_found for an unknown one', async () => {
    const malformed = await request('GET', '/validation-issues/abc')
    const unknown = await request('GET', '/validation-issues/999999')

    expect(malformed.statusCode).toBe(400)
    expect(errorCode(malformed.json())).toBe('validation_error')
    expect(unknown.statusCode).toBe(404)
    expect(unknown.json()).toMatchObject({ code: 'not_found', message: 'Validation issue not found' })
  })
})

/** Runs the validations and answers the in-batch duplicate with its occurrences. */
async function inBatchDuplicate() {
  await request('POST', `/imports/${importId}/validations`)
  const page = ValidationIssuesPage.parse(
    (await request('GET', `/imports/${importId}/validation-issues?type=duplicate&scope=in_batch`)).json(),
  )
  return ValidationIssueDetail.parse((await request('GET', `/validation-issues/${page.items[0]!.issueId}`)).json())
}

describe('PATCH /conflict-occurrences/:occurrenceId', () => {
  it('200 with the detail of the finding and the change author', async () => {
    const dup = await inBatchDuplicate()
    const excluded = dup.occurrences.find((o) => !o.defaultIncluded)!

    const res = await request('PATCH', `/conflict-occurrences/${excluded.occurrenceId}`, {
      body: { includeInSettlement: true },
    })

    expect(res.statusCode).toBe(200)
    const detail = ValidationIssueDetail.parse(res.json())
    expect(detail.occurrences.find((o) => o.occurrenceId === excluded.occurrenceId)?.changedBy?.userName).toBe(
      'analyst',
    )
  })

  it('403 for viewer, 400 for a body that is not strict or not boolean, 400 for an id of 20 digits', async () => {
    const dup = await inBatchDuplicate()
    const id = dup.occurrences[0]!.occurrenceId

    const forbidden = await request('PATCH', `/conflict-occurrences/${id}`, {
      body: { includeInSettlement: true },
      user: 'viewer',
    })
    expect(forbidden.statusCode).toBe(403)
    for (const body of [{ includeInSettlement: 'yes' }, { includeInSettlement: true, note: 'x' }, {}]) {
      const res = await request('PATCH', `/conflict-occurrences/${id}`, { body })
      expect(res.statusCode, JSON.stringify(body)).toBe(400)
      expect(errorCode(res.json())).toBe('validation_error')
    }
    const long = await request('PATCH', `/conflict-occurrences/${'9'.repeat(20)}`, {
      body: { includeInSettlement: true },
    })
    expect(long.statusCode).toBe(400)
  })

  it('400 validation_error for 19 digits above the BIGINT maximum; the maximum itself is a well-formed id (404)', async () => {
    await inBatchDuplicate()

    const over = await request('PATCH', '/conflict-occurrences/9223372036854775808', {
      body: { includeInSettlement: true },
    })
    const max = await request('PATCH', '/conflict-occurrences/9223372036854775807', {
      body: { includeInSettlement: true },
    })

    expect(over.statusCode).toBe(400)
    expect(errorCode(over.json())).toBe('validation_error')
    expect(max.statusCode).toBe(404)
  })

  it('404 not_found for an unknown occurrence', async () => {
    await inBatchDuplicate()

    const res = await request('PATCH', '/conflict-occurrences/999999', { body: { includeInSettlement: true } })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ code: 'not_found', message: 'Conflict occurrence not found' })
  })
})

describe('PATCH /validation-issues/:issueId', () => {
  async function nraId() {
    await request('POST', `/imports/${importId}/validations`)
    const page = ValidationIssuesPage.parse(
      (await request('GET', `/imports/${importId}/validation-issues?type=non_recorded_adjustment`)).json(),
    )
    return page.items[0]!.issueId
  }

  it('200 with the finding resolved', async () => {
    const issueId = await nraId()

    const res = await request('PATCH', `/validation-issues/${issueId}`, {
      body: { resolutionStatus: 'resolved', note: 'Verified in the gateway' },
    })

    expect(res.statusCode).toBe(200)
    expect(ValidationIssueDetail.parse(res.json())).toMatchObject({
      resolutionStatus: 'resolved',
      resolutionNote: 'Verified in the gateway',
    })
  })

  it('403 for viewer, 400 for an empty or too long note, 422 for a duplicate', async () => {
    const issueId = await nraId()
    const forbidden = await request('PATCH', `/validation-issues/${issueId}`, {
      body: { resolutionStatus: 'resolved', note: 'x' },
      user: 'viewer',
    })
    expect(forbidden.statusCode).toBe(403)
    for (const note of ['', 'x'.repeat(501)]) {
      const res = await request('PATCH', `/validation-issues/${issueId}`, {
        body: { resolutionStatus: 'resolved', note },
      })
      expect(res.statusCode).toBe(400)
    }
    const dup = await inBatchDuplicate()
    const res = await request('PATCH', `/validation-issues/${dup.issueId}`, {
      body: { resolutionStatus: 'resolved', note: 'x' },
    })
    expect(res.statusCode).toBe(422)
    expect(res.json()).toMatchObject({ code: 'issue_not_resolvable', details: { issueType: 'duplicate' } })
  })
})

describe('POST /imports/:importId/review', () => {
  it('200 validated with the review of the current run', async () => {
    const run = ValidationRunView.parse((await request('POST', `/imports/${importId}/validations`)).json())

    const res = await request('POST', `/imports/${importId}/review`, { body: { runId: run.run!.runId } })

    expect(res.statusCode).toBe(200)
    const view = ValidationRunView.parse(res.json())
    expect(view.importStatus).toBe('validated')
    expect(view.run?.review?.reviewedBy.userName).toBe('analyst')
  })

  it('400 validation_error without runId or with extra fields, 403 for viewer, 409 without a run', async () => {
    for (const body of [{}, { runId: 1, decision: 'cancel' }, { runId: 'one' }]) {
      const res = await request('POST', `/imports/${importId}/review`, { body })
      expect(res.statusCode, JSON.stringify(body)).toBe(400)
      expect(errorCode(res.json())).toBe('validation_error')
    }
    const forbidden = await request('POST', `/imports/${importId}/review`, { body: { runId: 1 }, user: 'viewer' })
    expect(forbidden.statusCode).toBe(403)
    const required = await request('POST', `/imports/${importId}/review`, { body: { runId: 1 } })
    expect(required.statusCode).toBe(409)
    expect(errorCode(required.json())).toBe('validation_run_required')
  })
})
