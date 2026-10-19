import { describe, expect, it } from 'vitest'
import { attemptFor, proposeBatchNumber } from './batch-number.js'

// Spec settlement "Intentos de batch" and "Siguiente número de batch" (design D7, P13).
const attempts = [
  { batchNo: 121, attemptNo: 1, status: 'paid' as const, importId: 'i121' },
  { batchNo: 122, attemptNo: 1, status: 'processed' as const, importId: 'i122' },
  { batchNo: 118, attemptNo: 1, status: 'undone' as const, importId: 'i118' },
  { batchNo: 130, attemptNo: 1, status: 'undone' as const, importId: 'abandoned' },
]

describe('proposeBatchNumber', () => {
  it('proposes the greatest batchNo of the account in any status + 1 (an abandoned number is not proposed again)', () => {
    expect(proposeBatchNumber(attempts, null)).toEqual({ batchNo: 131, attemptNo: 1, reason: 'next' })
  })

  it('proposes 1 for an account without attempts', () => {
    expect(proposeBatchNumber([], null)).toEqual({ batchNo: 1, attemptNo: 1, reason: 'next' })
  })

  it('proposes the number of the import undone attempt again, with the next attempt (reprocess)', () => {
    expect(proposeBatchNumber(attempts, 'i118')).toEqual({ batchNo: 118, attemptNo: 2, reason: 'reprocess' })
  })

  it('takes the latest undone attempt of the import', () => {
    const twice = [...attempts, { batchNo: 118, attemptNo: 2, status: 'undone' as const, importId: 'i118' }]
    expect(proposeBatchNumber(twice, 'i118')).toEqual({ batchNo: 118, attemptNo: 3, reason: 'reprocess' })
  })

  it('falls back to the next number when the number of the undone attempt has an active attempt now', () => {
    const taken = [...attempts, { batchNo: 118, attemptNo: 2, status: 'processed' as const, importId: 'other' }]
    expect(proposeBatchNumber(taken, 'i118')).toEqual({ batchNo: 131, attemptNo: 1, reason: 'next' })
  })

  it('an import without attempts gets the next number', () => {
    expect(proposeBatchNumber(attempts, 'new')).toEqual({ batchNo: 131, attemptNo: 1, reason: 'next' })
  })
})

describe('attemptFor', () => {
  it('a new number: attempt 1, available', () => {
    expect(attemptFor(attempts, 140)).toEqual({ attemptNo: 1, available: true, holder: null })
  })

  it('a number with only undone attempts: the greatest attempt + 1, available', () => {
    expect(attemptFor(attempts, 118)).toEqual({ attemptNo: 2, available: true, holder: null })
  })

  it('a number with an active attempt: not available, with the attempt holding it', () => {
    expect(attemptFor(attempts, 122)).toEqual({ attemptNo: 2, available: false, holder: attempts[1] })
    expect(attemptFor(attempts, 121)).toMatchObject({ available: false, holder: attempts[0] })
  })
})
