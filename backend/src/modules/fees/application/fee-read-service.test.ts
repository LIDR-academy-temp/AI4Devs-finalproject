import { AccountFee, FeeTypeView } from '@recon/shared'
import { describe, expect, it } from 'vitest'
import { NotFoundError } from '../../../shared/errors.js'
import { ACCOUNT_IDS } from '../../catalog/application/__fakes__/in-memory.js'
import { InMemoryFeeRepository } from './__fakes__/in-memory.js'
import { FeeReadService } from './fee-read-service.js'

// Spec fees "Fees de la cuenta vigentes a una fecha" and "Catálogo de tipos de fee".
const ALL = { merchantIds: [1, 2] }
const MERCHANT_1 = { merchantIds: [1] }

describe('FeeReadService.accountFees', () => {
  it('lists the non-transactional presets of ProviderB-Main: Monthly Fee 250.0000, always', async () => {
    const service = new FeeReadService(new InMemoryFeeRepository())

    const fees = await service.accountFees(ALL, ACCOUNT_IDS['ProviderB-Main'], { transactional: false })

    expect(fees).toEqual([
      expect.objectContaining({ code: 'Monthly Fee', fixedAmount: '250.0000', startDate: null, endDate: null }),
    ])
    for (const fee of fees) expect(AccountFee.safeParse(fee).success).toBe(true)
  })

  it('filters by transactional and keeps every type without the filter', async () => {
    const service = new FeeReadService(new InMemoryFeeRepository())

    const transactional = await service.accountFees(ALL, ACCOUNT_IDS['ProviderA-USD'], { transactional: true })
    const all = await service.accountFees(ALL, ACCOUNT_IDS['ProviderA-USD'], {})

    expect(transactional.every((f) => f.isTransactional)).toBe(true)
    expect(transactional).toHaveLength(6)
    expect(all).toHaveLength(7)
  })

  it('returns a percentage-only preset without an amount (P9)', async () => {
    const service = new FeeReadService(new InMemoryFeeRepository())

    const presets = await service.accountFees(ALL, ACCOUNT_IDS['ProviderA-USD'], { transactional: false })

    expect(presets).toEqual([
      expect.objectContaining({ code: 'Chargeback over 1%', fixedAmount: null, percentage: '0.010000' }),
    ])
  })

  it('keeps only the fees in force at asOf (business date)', async () => {
    const repo = new InMemoryFeeRepository()
    repo.add('ProviderC-USD', { feeTypeId: 121, fixed: 30, endDate: '2026-10-31' })
    repo.add('ProviderC-USD', { feeTypeId: 121, fixed: 35, startDate: '2026-11-01' })
    const service = new FeeReadService(repo)

    const fees = await service.accountFees(ALL, ACCOUNT_IDS['ProviderC-USD'], {
      transactional: false,
      asOf: '2026-10-15',
    })

    expect(fees.map((f) => f.fixedAmount)).toEqual(['30.0000'])
  })

  it('orders by title and then by start date, the open start first', async () => {
    const repo = new InMemoryFeeRepository()
    repo.add('ProviderC-USD', { feeTypeId: 121, fixed: 35, startDate: '2026-11-01' })
    repo.add('ProviderC-USD', { feeTypeId: 121, fixed: 30, endDate: '2026-10-31' })
    repo.add('ProviderC-USD', { feeTypeId: 101, fixed: 500 })
    const service = new FeeReadService(repo)

    const fees = await service.accountFees(ALL, ACCOUNT_IDS['ProviderC-USD'], { transactional: false })

    expect(fees.map((f) => [f.title, f.startDate])).toEqual([
      ['Annual Fee', null],
      ['Wire Fee', null],
      ['Wire Fee', '2026-11-01'],
    ])
  })

  it('throws NotFoundError for an account outside the scope, as for an unknown one', async () => {
    const service = new FeeReadService(new InMemoryFeeRepository())

    await expect(service.accountFees(MERCHANT_1, ACCOUNT_IDS['ProviderC-Alt'], {})).rejects.toThrow(NotFoundError)
    await expect(service.accountFees(ALL, '00000000-0000-4000-8000-00000000ffff', {})).rejects.toThrow(NotFoundError)
  })
})

describe('FeeReadService.feeTypes', () => {
  it('lists the 6 transactional and 21 non-transactional types in feeTypeId order', async () => {
    const service = new FeeReadService(new InMemoryFeeRepository())

    const types = await service.feeTypes()

    expect(types.filter((t) => t.isTransactional)).toHaveLength(6)
    expect(types.filter((t) => !t.isTransactional)).toHaveLength(21)
    expect(types.map((t) => t.feeTypeId)).toEqual([...types.map((t) => t.feeTypeId)].sort((a, b) => a - b))
    expect(types.find((t) => t.code === 'Special Adjustment')?.allowsFreeAmount).toBe(true)
    for (const t of types) expect(FeeTypeView.safeParse(t).success).toBe(true)
  })
})
