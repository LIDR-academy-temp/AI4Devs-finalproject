import { ErrorResponse, ValidationRunView } from '@recon/shared'
import type { InjectOptions } from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildTestApp, PASSWORD } from '../../../test-support/build-test-app.js'
import { InMemoryRunRepository } from '../application/__fakes__/in-memory-runs.js'
import { ValidationService } from '../application/validation-service.js'
import { sampleInput } from '../test-support/sample-input.js'

// The validation routes over the service on doubles (validation-runs design D14): status codes, error codes and the
// shape of every body checked with the shared schemas.
const UNKNOWN_UUID = '00000000-0000-4000-8000-00000000ffff'

let ctx: Awaited<ReturnType<typeof buildTestApp>>
let runs: InMemoryRunRepository
let importId: string
let foreignImportId: string

beforeEach(async () => {
  const issues = await sampleInput('batch-issues')
  const legacy = await sampleInput('legacy-provider')
  runs = new InMemoryRunRepository()
  importId = issues.importId
  foreignImportId = legacy.importId
  runs.addImport({ importId, merchantId: 1, status: 'analyzed' })
  // ProviderC-Alt belongs to merchant 2: outside the viewer's scope.
  runs.addImport({ importId: foreignImportId, merchantId: 2, status: 'analyzed' })
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
    const foreign = await request('GET', `/imports/${foreignImportId}/validations`, { user: 'viewer' })
    expect(unknown.statusCode).toBe(404)
    expect(foreign.json()).toEqual(unknown.json())
    expect((await request('GET', '/imports/abc/validations')).statusCode).toBe(400)
  })
})
