import { SettlementPreview } from '@recon/shared'
import { describe, expect, it } from 'vitest'
import { NotFoundError } from '../../../shared/errors.js'
import { EXAMPLE_BATCH_ID, exampleView } from '../test-support/example-view.js'
import { prefilledBatchFees, settlementSampleInput } from '../test-support/sample-input.js'
import {
  InMemoryPrefilledBatchFees,
  InMemorySettlementReader,
  InMemorySettlementRepository,
  InMemorySettlementSource,
  type InMemorySourceOptions,
} from './__fakes__/in-memory.js'
import { SettlementService } from './settlement-service.js'

// Orchestration of the service over the doubles (design D5, D19): the preview writes nothing, processing delegates to
// the repository and answers the view read back; the transactional rules are the integration tests'.
const ANALYST = { merchantIds: [1, 2] }
const MERCHANT_2 = { merchantIds: [2] }
const NOW = new Date('2026-10-19T15:40:03.120Z')
const input = await settlementSampleInput('batch-clean')
const fees = prefilledBatchFees('batch-clean')

function service(options: InMemorySourceOptions = {}, attempts = input.attempts) {
  const source = new InMemorySettlementSource({ ...input, attempts }, options)
  const repository = new InMemorySettlementRepository()
  const reader = new InMemorySettlementReader(new Map([[EXAMPLE_BATCH_ID, exampleView()]]))
  const prefilled = new InMemoryPrefilledBatchFees(input.prefilledFeeTypeIds)
  return {
    source,
    repository,
    service: new SettlementService({ source, prefilled, repository, reader, clock: () => NOW }),
  }
}

describe('preview', () => {
  it('answers the figures of batch-clean: batch 123, otherFeeAmt 40.0000, RAM-07 to assign, and writes nothing', async () => {
    const { service: s, repository } = service()

    const preview = await s.preview(ANALYST, input.importId, { runId: input.runId, batchFees: fees })

    expect(SettlementPreview.parse(preview)).toMatchObject({
      importId: input.importId,
      runId: input.runId,
      batchNo: 123,
      attemptNo: 1,
      batchNoAvailable: true,
      otherFeeAmt: '40.0000',
      requiresChannelConfirmation: true,
      channelsToAssign: [{ name: 'RAM-07', assignment: 'unassigned' }],
      movements: { E: 450, I: 10, R: 320 },
    })
    expect(preview.batchFees.map((f) => [f.code, f.batchFeeId, f.enteredBy])).toEqual([
      ['Wire Fee', null, null],
      ['Settlement Fee', null, null],
    ])
    expect(repository.commands).toEqual([])
  })

  it('tells that a number with an active attempt is not available, without failing', async () => {
    const taken = [...input.attempts, { batchNo: 123, attemptNo: 1, status: 'processed' as const, importId: 'other' }]
    const { service: s } = service({}, taken)

    const preview = await s.preview(ANALYST, input.importId, { runId: input.runId, batchNo: 123 })

    expect(preview).toMatchObject({ batchNo: 123, attemptNo: 2, batchNoAvailable: false })
  })

  it('refuses in the order of the precondition: 404, import_not_validated, run superseded, blocking, batch fee', async () => {
    await expect(service().service.preview(MERCHANT_2, input.importId, { runId: 1 })).rejects.toThrow(NotFoundError)
    await expect(
      service({ status: 'analyzed' }).service.preview(ANALYST, input.importId, { runId: 1 }),
    ).rejects.toMatchObject({ code: 'import_not_validated', details: { status: 'analyzed' } })
    await expect(service().service.preview(ANALYST, input.importId, { runId: 99 })).rejects.toMatchObject({
      code: 'validation_run_superseded',
      details: { runId: 99, currentRunId: input.runId },
    })
    await expect(
      service({ blocked: { validationCodes: ['provider_mismatch'], issueIds: [4411] } }).service.preview(
        ANALYST,
        input.importId,
        { runId: input.runId },
      ),
    ).rejects.toMatchObject({ code: 'blocking_validation_issue', details: { validationCodes: ['provider_mismatch'] } })
    await expect(
      service().service.preview(ANALYST, input.importId, {
        runId: input.runId,
        batchFees: [{ feeTypeId: 119, feeId: null, amount: '-1', source: 'manual' }],
      }),
    ).rejects.toMatchObject({ code: 'batch_fee_invalid', details: { index: 0, reason: 'description_required' } })
  })
})

describe('process', () => {
  it('delegates to the repository with the user, the pre-filled fee types and the clock, and answers the view', async () => {
    const { service: s, repository } = service()
    const request = { runId: input.runId, confirmChannelAssignment: true, batchFees: fees }

    const view = await s.process(ANALYST, 2, input.importId, request)

    expect(view).toEqual(exampleView())
    expect(repository.commands).toEqual([
      { importId: input.importId, userId: 2, request, prefilledFeeTypeIds: input.prefilledFeeTypeIds, now: NOW },
    ])
  })

  it('answers 404 for an import outside the scope before touching the repository', async () => {
    const { service: s, repository } = service()

    await expect(s.process(MERCHANT_2, 2, input.importId, { runId: 1 })).rejects.toThrow(NotFoundError)
    expect(repository.commands).toEqual([])
  })

  it('answers import_not_validated before the repository for an import in another status', async () => {
    const { service: s, repository } = service({ status: 'processed' })

    await expect(s.process(ANALYST, 2, input.importId, { runId: 1 })).rejects.toMatchObject({
      code: 'import_not_validated',
      details: { status: 'processed' },
    })
    expect(repository.commands).toEqual([])
  })
})

describe('nextBatchNumber', () => {
  it('proposes 123 for ProviderA-USD (expected.proposedBatchNo)', async () => {
    expect(await service().service.nextBatchNumber(ANALYST, input.account.accountId)).toEqual({
      accountId: input.account.accountId,
      batchNo: 123,
      attemptNo: 1,
      reason: 'next',
    })
  })

  it('proposes the number of the import undone attempt again (reprocess)', async () => {
    const undone = [
      ...input.attempts,
      { batchNo: 123, attemptNo: 1, status: 'undone' as const, importId: input.importId },
    ]

    expect(await service({}, undone).service.nextBatchNumber(ANALYST, input.account.accountId, input.importId)).toEqual(
      { accountId: input.account.accountId, batchNo: 123, attemptNo: 2, reason: 'reprocess' },
    )
  })

  it('answers 404 for an account outside the scope, or an import that is not of the account', async () => {
    await expect(service().service.nextBatchNumber(MERCHANT_2, input.account.accountId)).rejects.toThrow(NotFoundError)
    await expect(
      service().service.nextBatchNumber(ANALYST, input.account.accountId, '00000000-0000-4000-8000-00000000ffff'),
    ).rejects.toThrow(NotFoundError)
  })
})
