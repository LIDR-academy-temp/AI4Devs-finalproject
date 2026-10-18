import { ImportStatus } from '@recon/shared'
import { describe, expect, it } from 'vitest'
import { ImportNotCancellableError, ImportNotEditableError, ImportNotMappedError } from './errors.js'
import {
  assertCanAnalyze,
  assertCanCancel,
  assertCanConfirmMapping,
  assertCanEditFiles,
  assertCanResolveRow,
  EDITABLE_STATUSES,
} from './import-state.js'

// The full transition table of the spec "Máquina de estados del import" (design D2): every action × every status.
const STATUSES = ImportStatus.options

type Guard = (status: ImportStatus) => void

interface Row {
  action: string
  guard: Guard
  allowed: ImportStatus[]
  error: new (...args: never[]) => Error
}

const TABLE: Row[] = [
  {
    action: 'confirm mapping',
    guard: assertCanConfirmMapping,
    allowed: ['uploaded', 'mapped'],
    error: ImportNotEditableError,
  },
  {
    action: 'add/remove files',
    guard: assertCanEditFiles,
    allowed: ['uploaded', 'mapped'],
    error: ImportNotEditableError,
  },
  { action: 'analyze', guard: assertCanAnalyze, allowed: ['mapped'], error: ImportNotMappedError },
  { action: 'resolve row', guard: assertCanResolveRow, allowed: ['analyzed'], error: ImportNotEditableError },
  {
    action: 'cancel',
    guard: assertCanCancel,
    allowed: ['uploaded', 'mapped', 'analyzed', 'validated'],
    error: ImportNotCancellableError,
  },
]

describe('import state machine', () => {
  it('covers the six statuses of the vocabulary', () => {
    expect(STATUSES).toEqual(['uploaded', 'mapped', 'analyzed', 'validated', 'processed', 'cancelled'])
  })

  describe.each(TABLE)('$action', ({ guard, allowed, error }) => {
    it.each(STATUSES)('from %s', (status) => {
      if (allowed.includes(status)) {
        expect(() => guard(status)).not.toThrow()
      } else {
        expect(() => guard(status)).toThrow(error)
        try {
          guard(status)
        } catch (thrown) {
          expect(thrown).toMatchObject({ status: 409, details: { status } })
        }
      }
    })
  })

  it('exposes the editable statuses for the file routes', () => {
    expect([...EDITABLE_STATUSES].sort()).toEqual(['mapped', 'uploaded'])
  })
})
