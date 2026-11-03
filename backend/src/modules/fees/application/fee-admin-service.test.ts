import { AccountFee, FeeUpdateResult } from '@recon/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { NotFoundError } from '../../../shared/errors.js'
import { ACCOUNT_IDS } from '../../catalog/application/__fakes__/in-memory.js'
import { FeeInUseError, FeeOverlapError, FeeRuleError } from '../domain/errors.js'
import { InMemoryFeeAdminRepository } from './__fakes__/in-memory-admin.js'
import { FeeAdminService } from './fee-admin-service.js'

// Spec fees "Crear un fee", "Corregir un fee en el sitio", "Cerrar la vigencia de un fee", "Cambiar un fee desde una
// fecha", "Solapes al administrar fees", "Historial", "Auditoría de los cambios de fees" (admin-fees design D3, D6, D10).
const ALL = { merchantIds: [1, 2] }
const MERCHANT_1 = { merchantIds: [1] }
const ADMIN = 1
const ACCOUNT = ACCOUNT_IDS['ProviderA-USD']
const MDR = 1
const WIRE = 121

let repo: InMemoryFeeAdminRepository
let service: FeeAdminService
let ids: number

beforeEach(() => {
  repo = new InMemoryFeeAdminRepository()
  ids = 0
  service = new FeeAdminService(
    repo,
    () => '2026-11-03',
    () => `00000000-0000-4000-8000-${String(++ids).padStart(12, '0')}`,
  )
})

describe('FeeAdminService.create', () => {
  it('creates a fee with open validity, not in use, and records history and audit', async () => {
    const fee = await service.create(ALL, ADMIN, ACCOUNT, {
      feeTypeId: WIRE,
      fixedAmount: '15',
      startDate: null,
      endDate: null,
    })

    expect(AccountFee.parse(fee)).toMatchObject({
      feeTypeId: WIRE,
      code: 'Wire Fee',
      fixedAmount: '15.0000',
      startDate: null,
      endDate: null,
      status: 'active',
      inUse: false,
      lastAppliedEventDate: null,
      createdBy: { userName: 'admin' },
    })
    expect(repo.store.history).toEqual([
      expect.objectContaining({ feeId: fee.feeId, action: 'created', before: null, reason: null, userId: ADMIN }),
    ])
    expect(repo.store.audit).toEqual([{ action: 'fee.create', feeId: fee.feeId, detail: {}, userId: ADMIN }])
  })

  it('is scheduled when it starts after today', async () => {
    const fee = await service.create(ALL, ADMIN, ACCOUNT, {
      feeTypeId: WIRE,
      fixedAmount: '15',
      startDate: '2027-01-01',
      endDate: null,
    })
    expect(fee.status).toBe('scheduled')
  })

  it('rejects an unknown or inactive fee type with details.field = feeTypeId', async () => {
    repo.inactiveTypes.add(WIRE)
    for (const feeTypeId of [WIRE, 999]) {
      const error = await service
        .create(ALL, ADMIN, ACCOUNT, { feeTypeId, fixedAmount: '1', startDate: null, endDate: null })
        .catch((e) => e)
      expect(error, String(feeTypeId)).toBeInstanceOf(FeeRuleError)
      expect(error.details).toEqual({ field: 'feeTypeId' })
    }
    expect(repo.store.rows).toEqual([])
  })

  it('rejects an overlap with another fee of the same type, listing the conflict', async () => {
    repo.seed('ProviderA-USD', { feeId: 'existing', feeTypeId: MDR, percentage: '0.100000' })

    const error = await service
      .create(ALL, ADMIN, ACCOUNT, { feeTypeId: MDR, percentage: '0.09', startDate: '2026-11-01', endDate: null })
      .catch((e) => e)

    expect(error).toBeInstanceOf(FeeOverlapError)
    expect(error.details).toEqual({ conflicts: [{ feeId: 'existing', startDate: null, endDate: null }] })
    expect(repo.store.rows).toHaveLength(1)
    expect(repo.store.history).toEqual([])
  })

  it('takes a scheduled fee next to the current one and another type', async () => {
    repo.seed('ProviderA-USD', { feeId: 'existing', feeTypeId: MDR, percentage: '0.100000', endDate: '2026-12-31' })

    await service.create(ALL, ADMIN, ACCOUNT, {
      feeTypeId: MDR,
      percentage: '0.09',
      startDate: '2027-01-01',
      endDate: null,
    })
    await service.create(ALL, ADMIN, ACCOUNT, { feeTypeId: 2, fixedAmount: '0.65', startDate: null, endDate: null })

    expect(repo.store.rows).toHaveLength(3)
  })

  it('answers NotFoundError for an account outside the scope, as for an unknown one', async () => {
    const body = { feeTypeId: WIRE, fixedAmount: '1', startDate: null, endDate: null }
    await expect(service.create(MERCHANT_1, ADMIN, ACCOUNT_IDS['ProviderC-Alt'], body)).rejects.toThrow(NotFoundError)
    await expect(service.create(ALL, ADMIN, '00000000-0000-4000-8000-00000000ffff', body)).rejects.toThrow(
      NotFoundError,
    )
  })
})

describe('FeeAdminService.patch', () => {
  const USED = { inUse: true, lastAppliedEventDate: '2026-10-15' }

  it('corrects a fee without use in place, with history and audit', async () => {
    repo.seed('ProviderA-USD', { feeId: 'mdr', feeTypeId: MDR, percentage: '0.025000' })

    const result = await service.patch(ALL, ADMIN, 'mdr', { percentage: '0.0275', reason: 'typo' })

    expect(FeeUpdateResult.parse(result)).toMatchObject({ fee: { percentage: '0.027500' }, successor: null })
    expect(repo.store.history).toEqual([
      expect.objectContaining({
        feeId: 'mdr',
        action: 'updated',
        before: expect.objectContaining({ percentage: '0.025000' }),
        after: expect.objectContaining({ percentage: '0.027500' }),
        reason: 'typo',
      }),
    ])
    expect(repo.store.audit).toEqual([
      { action: 'fee.update', feeId: 'mdr', detail: { changed: ['percentage'], reason: 'typo' }, userId: ADMIN },
    ])
  })

  it('rejects the values of a fee in use and leaves it untouched', async () => {
    repo.seed('ProviderA-USD', { feeId: 'mdr', feeTypeId: MDR, percentage: '0.100000' }, USED)

    const error = await service.patch(ALL, ADMIN, 'mdr', { percentage: '0.03' }).catch((e) => e)

    expect(error).toBeInstanceOf(FeeInUseError)
    expect(error.details).toEqual({ fields: ['percentage'] })
    expect(repo.feeOf('mdr')?.percentage).toBe('0.100000')
    expect(repo.store.history).toEqual([])
  })

  it('closes a fee in use as closed, audited as fee.close', async () => {
    repo.seed('ProviderA-USD', { feeId: 'chb', feeTypeId: 4, fixedAmount: '45.0000' }, USED)

    const result = await service.patch(ALL, ADMIN, 'chb', { endDate: '2026-10-31' })

    expect(result.fee).toMatchObject({ endDate: '2026-10-31', status: 'closed', inUse: true })
    expect(repo.store.history.map((h) => h.action)).toEqual(['closed'])
    expect(repo.store.audit).toEqual([
      { action: 'fee.close', feeId: 'chb', detail: { endDate: '2026-10-31' }, userId: ADMIN },
    ])
  })

  it('rejects a closing before the last applied event', async () => {
    repo.seed('ProviderA-USD', { feeId: 'chb', feeTypeId: 4, fixedAmount: '45.0000' }, USED)

    const error = await service.patch(ALL, ADMIN, 'chb', { endDate: '2026-10-01' }).catch((e) => e)

    expect(error).toBeInstanceOf(FeeInUseError)
    expect(error.details).toEqual({ lastAppliedEventDate: '2026-10-15' })
  })

  it('changes a fee from a date: closed and created in history, fee.change in the audit', async () => {
    repo.seed('ProviderA-USD', { feeId: 'mdr', feeTypeId: MDR, percentage: '0.100000', description: 'MDR' }, USED)

    const result = await service.patch(ALL, ADMIN, 'mdr', { effectiveFrom: '2026-11-01', percentage: '0.095' })

    expect(FeeUpdateResult.parse(result)).toMatchObject({
      fee: { feeId: 'mdr', endDate: '2026-10-31', status: 'closed' },
      successor: {
        startDate: '2026-11-01',
        endDate: null,
        percentage: '0.095000',
        description: 'MDR',
        status: 'active',
        inUse: false,
      },
    })
    const successorId = result.successor!.feeId
    expect(repo.store.history.map((h) => [h.feeId, h.action])).toEqual([
      ['mdr', 'closed'],
      [successorId, 'created'],
    ])
    expect(repo.store.audit).toEqual([
      {
        action: 'fee.change',
        feeId: 'mdr',
        detail: { successorFeeId: successorId, effectiveFrom: '2026-11-01' },
        userId: ADMIN,
      },
    ])
  })

  it('rejects a correction that overlaps another fee of the type', async () => {
    repo.seed('ProviderA-USD', { feeId: 'r1', feeTypeId: 5, fixedAmount: '5.0000', endDate: '2026-12-31' })
    repo.seed('ProviderA-USD', { feeId: 'r2', feeTypeId: 5, fixedAmount: '6.0000', startDate: '2027-01-01' })

    const error = await service.patch(ALL, ADMIN, 'r2', { startDate: '2026-12-15' }).catch((e) => e)

    expect(error).toBeInstanceOf(FeeOverlapError)
    expect(error.details).toEqual({ conflicts: [{ feeId: 'r1', startDate: null, endDate: '2026-12-31' }] })
  })

  it('checks the successor against the other fees of the type, not against the fee it replaces', async () => {
    repo.seed('ProviderA-USD', { feeId: 'r1', feeTypeId: 5, fixedAmount: '5.0000', endDate: '2027-06-30' })
    repo.seed('ProviderA-USD', { feeId: 'r2', feeTypeId: 5, fixedAmount: '6.0000', startDate: '2027-07-01' })

    const result = await service.patch(ALL, ADMIN, 'r1', { effectiveFrom: '2027-01-01', fixedAmount: '5.5' })

    expect(result.fee).toMatchObject({ feeId: 'r1', endDate: '2026-12-31' })
    expect(result.successor).toMatchObject({ startDate: '2027-01-01', endDate: '2027-06-30', fixedAmount: '5.5000' })
  })

  it('writes nothing when no value changes', async () => {
    repo.seed('ProviderA-USD', { feeId: 'mdr', feeTypeId: MDR, percentage: '0.100000' }, USED)

    const result = await service.patch(ALL, ADMIN, 'mdr', { percentage: '0.1' })

    expect(result.fee.percentage).toBe('0.100000')
    expect(repo.store.history).toEqual([])
    expect(repo.store.audit).toEqual([])
  })

  it('leaves nothing when the audit write fails', async () => {
    repo.seed('ProviderA-USD', { feeId: 'mdr', feeTypeId: MDR, percentage: '0.025000' })
    repo.failAudit = true

    await expect(service.patch(ALL, ADMIN, 'mdr', { percentage: '0.03' })).rejects.toThrow('audit write failed')

    expect(repo.feeOf('mdr')?.percentage).toBe('0.025000')
    expect(repo.store.history).toEqual([])
  })

  it('answers NotFoundError for a fee outside the scope, as for an unknown one', async () => {
    repo.seed('ProviderC-Alt', { feeId: 'alt', feeTypeId: 4, fixedAmount: '40.0000' })

    await expect(service.patch(MERCHANT_1, ADMIN, 'alt', { description: 'x' })).rejects.toThrow(NotFoundError)
    await expect(service.patch(ALL, ADMIN, 'unknown', { description: 'x' })).rejects.toThrow(NotFoundError)
  })
})
