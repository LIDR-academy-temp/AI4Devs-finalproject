import { describe, expect, it } from 'vitest'
import { Prisma } from '../../../generated/prisma/client.js'
import { isFeeOverlapTrigger } from './prisma-fee-admin-repository.js'

// admin-fees design D6: the trigger backstop is recognized by its SQL Server error number, as the adapter reports it.
const adapterError = (cause: Record<string, unknown>, code = 'P2010') =>
  new Prisma.PrismaClientKnownRequestError('Raw query failed', {
    code,
    clientVersion: 'test',
    meta: { driverAdapterError: { cause } },
  })

describe('isFeeOverlapTrigger', () => {
  it('is the 50001 of TR_Fee_NoOverlap, whatever the Prisma code', () => {
    const cause = { kind: 'mssql', code: 50001, message: 'Fee validity overlaps an existing fee' }
    expect(isFeeOverlapTrigger(adapterError(cause))).toBe(true)
    expect(isFeeOverlapTrigger(adapterError(cause, 'P2004'))).toBe(true)
  })

  it('is not another SQL Server error, even with the same message', () => {
    expect(isFeeOverlapTrigger(adapterError({ kind: 'mssql', code: 547, message: 'FK' }))).toBe(false)
    expect(
      isFeeOverlapTrigger(
        adapterError({ kind: 'mssql', code: 50002, message: 'Fee validity overlaps an existing fee' }),
      ),
    ).toBe(false)
    expect(isFeeOverlapTrigger(adapterError({ kind: 'TransactionWriteConflict' }))).toBe(false)
  })

  it('is not a plain error that only quotes the message', () => {
    expect(isFeeOverlapTrigger(new Error('Fee validity overlaps an existing fee'))).toBe(false)
    expect(isFeeOverlapTrigger(undefined)).toBe(false)
  })
})
