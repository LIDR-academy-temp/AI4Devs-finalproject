// The fake settlement API on its own, without screens (web-settlement design D15). It covers only what the fake
// models between requests: active batch numbers, the import validated → processed, the current run, the stored
// attempts, the channel confirmation, the scripted answers and the scope. Figures come from the fixtures, never
// from the fees the request sends.
import { describe, expect, it } from 'vitest'
import type {
  AccountFee,
  FeeTypeView,
  NextBatchNumber,
  SettlementPreview,
  SettlementRequest,
  SettlementView,
} from '@/features/settlements/contract'
import { strings } from '@/features/settlements/strings'
import { ACCOUNT_IDS, type UserName } from './fixtures'
import { issueTokens } from './handlers'
import { importRecord, seedImport } from './imports'
import {
  batchCleanPreview,
  failNextSettlement,
  holdNextSettlement,
  providerBPreview,
  respondNextSettlement,
  scriptPreview,
  seedActiveBatch,
  settlementRequests,
} from './settlements'
import { seedValidationRun } from './validations'

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

const USD = ACCOUNT_IDS['ProviderA-USD']

/** An import of batch-clean validated on a reviewed run, as Settlement Review finds it. */
function validatedClean() {
  const { importId } = seedImport('batch-clean', { status: 'validated' })
  const { runId } = seedValidationRun(importId, undefined, { reviewedBy: 'analyst' })
  return { importId, runId }
}

const FILE_FEES: SettlementRequest['batchFees'] = [
  { feeTypeId: 121, feeId: null, amount: '25.0000', description: 'Wire Fee', source: 'file' },
  { feeTypeId: 117, feeId: null, amount: '15.0000', description: 'Settlement Fee', source: 'file' },
]

const preview = (importId: string, body: SettlementRequest, as: UserName = 'analyst') =>
  call(as, 'POST', `/imports/${importId}/settlements/preview`, body)
const process = (importId: string, body: SettlementRequest, as: UserName = 'analyst') =>
  call(as, 'POST', `/imports/${importId}/settlements`, body)

describe('fake settlement API: reads for the form', () => {
  it('proposes the next batch number of the account', async () => {
    const { importId } = validatedClean()
    const next = await call('analyst', 'GET', `/accounts/${USD}/batch-number/next?importId=${importId}`)
    expect(next.status).toBe(200)
    expect(next.body as NextBatchNumber).toEqual({ accountId: USD, batchNo: 123, attemptNo: 1, reason: 'next' })
  })

  it('lists the non-transactional fees of the account in force on a date, and records the asOf', async () => {
    const fees = await call('analyst', 'GET', `/accounts/${USD}/fees?transactional=false&asOf=2026-10-24`)
    expect(fees.status).toBe(200)
    const list = fees.body as AccountFee[]
    expect(list.map((f) => [f.title, f.fixedAmount, f.percentage])).toEqual([['Chargeback over 1%', null, '0.010000']])
    expect(settlementRequests('fees').at(-1)!.url).toContain('asOf=2026-10-24')
  })

  it('lists the fee types of the seed with allowsFreeAmount', async () => {
    const types = (await call('analyst', 'GET', '/fee-types')).body as FeeTypeView[]
    const byTitle = (title: string) => types.find((t) => t.title === title)!
    expect(byTitle('Special Adjustment')).toMatchObject({ isTransactional: false, allowsFreeAmount: true })
    expect(byTitle('Wire Fee')).toMatchObject({ feeTypeId: 121, isTransactional: false, allowsFreeAmount: false })
    expect(types.some((t) => t.isTransactional)).toBe(true)
  })
})

describe('fake settlement API: preview', () => {
  it('answers the fixture, with batchNo and batchFees copied from the body and the figures of the fixture', async () => {
    const { importId, runId } = validatedClean()
    const base = batchCleanPreview()

    const first = await preview(importId, { runId, batchNo: 123, settlementDate: '2026-10-24', batchFees: FILE_FEES })
    expect(first.status).toBe(200)
    const view = first.body as SettlementPreview
    expect(view).toMatchObject({ importId, accountId: USD, runId, batchNo: 123, batchNoAvailable: true })
    expect(view.batchFees.map((f) => [f.feeTypeId, f.title, f.amount, f.source, f.batchFeeId, f.enteredBy])).toEqual([
      [121, 'Wire Fee', '25.0000', 'file', null, null],
      [117, 'Settlement Fee', '15.0000', 'file', null, null],
    ])
    expect(view.amountPayable).toBe(base.amountPayable)
    expect(view.otherFeeAmt).toBe(base.otherFeeAmt)

    // Other fees, the same figures: the fake does not sum anything.
    const second = await preview(importId, {
      runId,
      batchNo: 124,
      settlementDate: '2026-10-24',
      batchFees: [{ feeTypeId: 119, feeId: null, amount: '-42.5000', description: 'Fix', source: 'manual' }],
    })
    const other = second.body as SettlementPreview
    expect(other.batchNo).toBe(124)
    expect(other.batchFees.map((f) => [f.title, f.amount])).toEqual([['Special Adjustment', '-42.5000']])
    expect(other.amountPayable).toBe(base.amountPayable)
    expect(other.otherFeeAmt).toBe(base.otherFeeAmt)
    expect(other.payableBreakdown).toEqual(base.payableBreakdown)
  })

  it('says a batch number with an active attempt is not available', async () => {
    const { importId, runId } = validatedClean()
    seedActiveBatch(USD, 117)
    const view = (await preview(importId, { runId, batchNo: 117, settlementDate: '2026-10-24' }))
      .body as SettlementPreview
    expect(view.batchNoAvailable).toBe(false)
  })

  it('rejects an amount sent as a number, like the strict body of the API', async () => {
    const { importId, runId } = validatedClean()
    const answer = await call('analyst', 'POST', `/imports/${importId}/settlements/preview`, {
      runId,
      settlementDate: '2026-10-24',
      batchFees: [{ feeTypeId: 121, feeId: null, amount: 25, source: 'file' }],
    })
    expect(answer.status).toBe(400)
    expect(answer.body.code).toBe('validation_error')
  })

  it('answers the scripted steps in order: a batch_fee_invalid, then a preview that does not add up', async () => {
    const { importId, runId } = validatedClean()
    const odd = { ...batchCleanPreview(), amountPayable: '1.0000' }
    scriptPreview(importId, [
      { status: 400, code: 'batch_fee_invalid', details: { index: 1, reason: 'description_required' } },
      odd,
    ])
    const body = { runId, settlementDate: '2026-10-24', batchFees: FILE_FEES }
    const first = await preview(importId, body)
    expect(first.status).toBe(400)
    expect(first.body).toMatchObject({
      code: 'batch_fee_invalid',
      details: { index: 1, reason: 'description_required' },
    })
    expect(((await preview(importId, body)).body as SettlementPreview).amountPayable).toBe('1.0000')
    // Without a script, an empty description is not rejected: the fake does not decide it.
    const free = await preview(importId, {
      runId,
      settlementDate: '2026-10-24',
      batchFees: [{ feeTypeId: 119, feeId: null, amount: '5.0000', source: 'manual' }],
    })
    expect(free.status).toBe(200)
  })

  it('answers the ProviderB-Main variant for an import of that account', async () => {
    const { importId } = seedImport('batch-issues', { status: 'validated' })
    const { runId } = seedValidationRun(importId, undefined, { reviewedBy: 'analyst' })
    const view = (await preview(importId, { runId, settlementDate: '2026-10-24' })).body as SettlementPreview
    expect(view.warnings).toEqual(providerBPreview().warnings)
    expect(view.warnings.map((w) => w.code)).toContain('chargeback_reserve_policy_not_applied')
  })

  it('keeps the payable labels of the fixtures equal to the texts of the screen', () => {
    for (const line of [...batchCleanPreview().payableBreakdown, ...providerBPreview().payableBreakdown]) {
      expect(strings.payableLines[line.code]).toBe(line.label)
    }
  })
})

describe('fake settlement API: process and read', () => {
  it('creates the attempt, moves the import to processed and serves it by its id', async () => {
    const { importId, runId } = validatedClean()
    const created = await process(importId, {
      runId,
      batchNo: 123,
      settlementDate: '2026-10-24',
      confirmChannelAssignment: true,
      batchFees: FILE_FEES,
    })
    expect(created.status).toBe(201)
    const view = created.body as SettlementView
    expect(view).toMatchObject({
      importId,
      accountId: USD,
      accountName: 'ProviderA-USD',
      batchNo: 123,
      attemptNo: 1,
      status: 'processed',
      settledStatus: 'pending_payment',
      approvedBy: { userName: 'analyst' },
      settlementDate: '2026-10-24',
    })
    expect(view.processedAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/)
    expect(view.batchFees.map((f) => [f.title, f.amount, f.enteredBy?.userName])).toEqual([
      ['Wire Fee', '25.0000', 'analyst'],
      ['Settlement Fee', '15.0000', 'analyst'],
    ])
    expect(view.channelsAssigned).toEqual([
      { channelId: 1007, name: 'RAM-07', assignment: 'new_primary', previousAccount: null },
    ])
    expect(importRecord(importId)).toMatchObject({ status: 'processed', currentBatchId: view.batchId })

    const again = await process(importId, { runId, batchNo: 124, settlementDate: '2026-10-24' })
    expect(again.status).toBe(409)
    expect(again.body).toMatchObject({ code: 'import_not_validated', details: { status: 'processed' } })

    const read = await call('viewer', 'GET', `/settlements/${view.batchId}`)
    expect(read.status).toBe(200)
    expect(read.body).toEqual(view)
    expect((await call('analyst', 'GET', '/settlements/5c3f9e21-8a4b-4f0e-b1d2-000000000999')).status).toBe(404)
  })

  it('answers batch_no_taken for a number with an active attempt, and nothing changes', async () => {
    const { importId, runId } = validatedClean()
    const other = seedActiveBatch(USD, 123)
    const answer = await process(importId, {
      runId,
      batchNo: 123,
      settlementDate: '2026-10-24',
      confirmChannelAssignment: true,
    })
    expect(answer.status).toBe(409)
    expect(answer.body).toMatchObject({
      code: 'batch_no_taken',
      details: { batchNo: 123, attemptNo: 1, importId: other.importId },
    })
    expect(importRecord(importId).status).toBe('validated')
  })

  it('asks for the channel confirmation when the fixture requires it', async () => {
    const { importId, runId } = validatedClean()
    const answer = await process(importId, { runId, batchNo: 123, settlementDate: '2026-10-24' })
    expect(answer.status).toBe(409)
    expect(answer.body.code).toBe('channel_assignment_not_confirmed')
    expect(answer.body.details.channels).toEqual(batchCleanPreview().channelsToAssign)
    expect(importRecord(importId).status).toBe('validated')
  })

  it('answers validation_run_superseded for a run that is not the current one', async () => {
    const { importId, runId } = validatedClean()
    const answer = await preview(importId, { runId: runId - 1, settlementDate: '2026-10-24' })
    expect(answer.status).toBe(409)
    expect(answer.body).toMatchObject({ code: 'validation_run_superseded', details: { runId: runId - 1 } })
  })

  it('answers import_not_validated before a review', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const { runId } = seedValidationRun(importId)
    const answer = await preview(importId, { runId, settlementDate: '2026-10-24' })
    expect(answer.status).toBe(409)
    expect(answer.body).toMatchObject({ code: 'import_not_validated', details: { status: 'analyzed' } })
  })

  it('answers a scripted error once, without changing anything', async () => {
    const { importId, runId } = validatedClean()
    respondNextSettlement('process', { status: 409, code: 'import_not_validated', details: { status: 'analyzed' } })
    const body = { runId, batchNo: 123, settlementDate: '2026-10-24', confirmChannelAssignment: true }
    expect((await process(importId, body)).status).toBe(409)
    expect(importRecord(importId).status).toBe('validated')
    expect((await process(importId, body)).status).toBe(201)
  })
})

describe('fake settlement API: permissions and scope', () => {
  it('answers 403 to viewer on preview and process', async () => {
    const { importId, runId } = validatedClean()
    const body = { runId, settlementDate: '2026-10-24' }
    expect((await preview(importId, body, 'viewer')).status).toBe(403)
    expect((await process(importId, body, 'viewer')).status).toBe(403)
  })

  it('answers 404 outside the scope of the user', async () => {
    const { importId } = seedImport('legacy-provider', { status: 'validated' })
    const alt = ACCOUNT_IDS['ProviderC-Alt']
    expect((await call('viewer', 'GET', `/accounts/${alt}/batch-number/next?importId=${importId}`)).status).toBe(404)
    expect((await call('viewer', 'GET', `/accounts/${alt}/fees?transactional=false`)).status).toBe(404)
    // An import that is not of the account is not found either.
    const { importId: clean } = validatedClean()
    expect((await call('analyst', 'GET', `/accounts/${alt}/batch-number/next?importId=${clean}`)).status).toBe(404)
  })
})

describe('fake settlement API: test controls', () => {
  it('holds a request until released', async () => {
    const { importId, runId } = validatedClean()
    const hold = holdNextSettlement('preview')
    const answer = preview(importId, { runId, settlementDate: '2026-10-24' })
    await hold.arrived
    expect(settlementRequests('preview').at(-1)!.status).toBeNull()
    hold.release()
    expect((await answer).status).toBe(200)
  })

  it('fails a request as a network error', async () => {
    const { importId, runId } = validatedClean()
    failNextSettlement('process')
    await expect(process(importId, { runId, settlementDate: '2026-10-24' })).rejects.toThrow()
    expect(importRecord(importId).status).toBe('validated')
  })
})
