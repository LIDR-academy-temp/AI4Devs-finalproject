import { describe, expect, it } from 'vitest'
import { Prisma } from '../../../generated/prisma/client.js'
import { isDuplicateAccountName } from './prisma-account-admin-repository.js'

// The backstop of the unique account name (admin-accounts design D5): by Prisma code or SQL Server error number.
const known = (code: string, cause?: unknown) =>
  new Prisma.PrismaClientKnownRequestError('failed', {
    code,
    clientVersion: 'test',
    meta: cause === undefined ? {} : { driverAdapterError: { cause } },
  })

describe('isDuplicateAccountName', () => {
  it('is a P2002 from the client', () => {
    expect(isDuplicateAccountName(known('P2002'))).toBe(true)
  })

  it.each([2627, 2601])('is the SQL Server duplicate key error %i, whatever the Prisma code', (number) => {
    expect(isDuplicateAccountName(known('P2010', { kind: 'mssql', code: number, message: 'duplicate key' }))).toBe(true)
  })

  it('is not a foreign key violation (547) nor another driver error', () => {
    expect(isDuplicateAccountName(known('P2010', { kind: 'mssql', code: 547, message: 'FOREIGN KEY' }))).toBe(false)
    expect(isDuplicateAccountName(known('P2010', { kind: 'postgres', code: 2627 }))).toBe(false)
    expect(isDuplicateAccountName(known('P2010'))).toBe(false)
  })

  it('is not an error that is not a known Prisma request error', () => {
    expect(isDuplicateAccountName(new Error('duplicate key'))).toBe(false)
  })
})
