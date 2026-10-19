import { NextBatchNumber, SettlementPreview, SettlementView } from '@recon/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { buildTestApp, PASSWORD } from '../../../test-support/build-test-app.js'
import {
  InMemoryPrefilledBatchFees,
  InMemorySettlementReader,
  InMemorySettlementRepository,
  InMemorySettlementSource,
  type InMemorySourceOptions,
} from '../application/__fakes__/in-memory.js'
import { SettlementService } from '../application/settlement-service.js'
import { EXAMPLE_BATCH_ID, exampleView } from '../test-support/example-view.js'
import { prefilledBatchFees, settlementSampleInput } from '../test-support/sample-input.js'

// README §4.3, §4.4 (settlement-process "Contrato para #13"): the three routes against the shared schemas, the
// permission before the scope, the identical 404 and the validation of the body.
const input = await settlementSampleInput('batch-clean')
const UNKNOWN = '00000000-0000-4000-8000-00000000ffff'
let ctx: Awaited<ReturnType<typeof buildTestApp>> | undefined

afterEach(async () => {
  await ctx?.app.close()
  ctx = undefined
})

async function app(options: InMemorySourceOptions = {}) {
  const service = new SettlementService({
    source: new InMemorySettlementSource(input, options),
    prefilled: new InMemoryPrefilledBatchFees(input.prefilledFeeTypeIds),
    repository: new InMemorySettlementRepository(),
    reader: new InMemorySettlementReader(new Map([[EXAMPLE_BATCH_ID, exampleView()]])),
  })
  ctx = await buildTestApp({ settlement: { service } })
  await ctx.app.ready()
  return ctx
}

async function call(method: 'GET' | 'POST', url: string, userName?: string, payload?: object) {
  const headers = userName
    ? { authorization: `Bearer ${(await ctx!.authService.login({ userName, password: PASSWORD })).accessToken}` }
    : {}
  return ctx!.app.inject({ method, url: `/api/v1${url}`, headers, ...(payload ? { payload } : {}) })
}

const body = { runId: input.runId, confirmChannelAssignment: true, batchFees: prefilledBatchFees('batch-clean') }

describe('POST /imports/{id}/settlements', () => {
  it('answers 201 with the view of the attempt', async () => {
    await app()

    const res = await call('POST', `/imports/${input.importId}/settlements`, 'analyst', body)

    expect(res.statusCode, res.body).toBe(201)
    expect(SettlementView.parse(res.json())).toEqual(exampleView())
  })

  it('answers 401 without a token and 403 forbidden to viewer, before the scope', async () => {
    await app()

    expect((await call('POST', `/imports/${input.importId}/settlements`, undefined, body)).statusCode).toBe(401)
    const forbidden = await call('POST', `/imports/${UNKNOWN}/settlements`, 'viewer', body)
    expect(forbidden.statusCode).toBe(403)
    expect(forbidden.json().code).toBe('forbidden')
  })

  it('answers the same 404 not_found for an import outside the scope and an unknown one', async () => {
    await app({ merchantId: 3 })

    const outside = await call('POST', `/imports/${input.importId}/settlements`, 'analyst', body)
    const unknown = await call('POST', `/imports/${UNKNOWN}/settlements`, 'analyst', body)

    expect(outside.statusCode).toBe(404)
    expect(outside.json()).toEqual(unknown.json())
    expect(outside.json()).toEqual({ code: 'not_found', message: 'Import not found' })
  })

  it('answers 400 validation_error without runId, with a JSON number as amount, with a zero amount, or extra fields', async () => {
    await app()
    const fee = { feeTypeId: 119, feeId: null, description: 'x', source: 'manual' }

    for (const bad of [
      { confirmChannelAssignment: true },
      { runId: 1, batchFees: [{ ...fee, amount: 25 }] },
      { runId: 1, batchFees: [{ ...fee, amount: '0.0000' }] },
      { runId: 1, extra: true },
    ]) {
      const res = await call('POST', `/imports/${input.importId}/settlements`, 'analyst', bad)
      expect(res.statusCode, JSON.stringify(bad)).toBe(400)
      expect(res.json().code).toBe('validation_error')
    }
  })

  it('answers 409 import_not_validated in another status', async () => {
    await app({ status: 'analyzed' })

    const res = await call('POST', `/imports/${input.importId}/settlements`, 'analyst', body)

    expect(res.statusCode).toBe(409)
    expect(res.json()).toEqual({
      code: 'import_not_validated',
      message: 'The import must be validated before processing (status: analyzed)',
      details: { status: 'analyzed' },
    })
  })
})

describe('POST /imports/{id}/settlements/preview', () => {
  it('answers 200 with the preview', async () => {
    await app()

    const res = await call('POST', `/imports/${input.importId}/settlements/preview`, 'analyst', body)

    expect(res.statusCode, res.body).toBe(200)
    expect(SettlementPreview.parse(res.json())).toMatchObject({ batchNo: 123, otherFeeAmt: '40.0000' })
  })

  it('answers 403 to viewer and 400 batch_fee_invalid with the index and the reason', async () => {
    await app()

    expect((await call('POST', `/imports/${input.importId}/settlements/preview`, 'viewer', body)).statusCode).toBe(403)
    const invalid = await call('POST', `/imports/${input.importId}/settlements/preview`, 'analyst', {
      runId: input.runId,
      batchFees: [{ feeTypeId: 121, feeId: null, amount: '1', description: 'x', source: 'manual' }],
    })
    expect(invalid.statusCode).toBe(400)
    expect(invalid.json()).toEqual({
      code: 'batch_fee_invalid',
      message: 'Batch fee 0 is not valid: free_amount_not_allowed',
      details: { index: 0, reason: 'free_amount_not_allowed' },
    })
  })
})

describe('GET /accounts/{id}/batch-number/next', () => {
  it('answers the proposed number to any authenticated user in scope', async () => {
    await app()

    const res = await call('GET', `/accounts/${input.account.accountId}/batch-number/next`, 'viewer')

    expect(res.statusCode, res.body).toBe(200)
    expect(NextBatchNumber.parse(res.json())).toEqual({
      accountId: input.account.accountId,
      batchNo: 123,
      attemptNo: 1,
      reason: 'next',
    })
  })

  it('answers the same 404 for an account outside the scope and an unknown one, and 400 for a malformed importId', async () => {
    await app({ merchantId: 3 })

    const outside = await call('GET', `/accounts/${input.account.accountId}/batch-number/next`, 'analyst')
    const unknown = await call('GET', `/accounts/${UNKNOWN}/batch-number/next`, 'analyst')
    const malformed = await call('GET', `/accounts/${UNKNOWN}/batch-number/next?importId=nope`, 'analyst')

    expect(outside.statusCode).toBe(404)
    expect(outside.json()).toEqual(unknown.json())
    expect(malformed.statusCode).toBe(400)
  })
})
