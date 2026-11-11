import { describe, expect, it } from 'vitest'
import { DomainError } from '../../../shared/errors.js'
import {
  CandidateNotFoundError,
  ImportFileLimitReachedError,
  ImportNotCancellableError,
  ImportNotMappedError,
  ImportTooLargeError,
  MappingIncompleteError,
  MappingShapeError,
  NoMatchedRowsError,
  RowNotAmbiguousError,
} from './errors.js'

// Codes and statuses of the analysis errors (spec "Máquina de estados del import", "Precondiciones del análisis",
// "Límite de filas por import", "Forma del pareo confirmado", "Resolución de una fila ambigua"; design D2).
describe('analysis errors', () => {
  it('ImportNotMappedError is 409 import_not_mapped with the current status', () => {
    const error = new ImportNotMappedError('uploaded')

    expect(error).toBeInstanceOf(DomainError)
    expect(error).toMatchObject({ status: 409, code: 'import_not_mapped', details: { status: 'uploaded' } })
    expect(error.message).toMatch(/mapped/)
  })

  it('ImportNotMappedError names a concurrent change when the status is still mapped', () => {
    const error = new ImportNotMappedError('mapped', true)

    expect(error.details).toEqual({ status: 'mapped' })
    expect(error.message).toMatch(/changed/)
  })

  it('MappingIncompleteError is 422 mapping_incomplete carrying the missing items', () => {
    const missing = [
      {
        sheetId: '00000000-0000-4000-8000-000000000001',
        sheetName: 'APP',
        field: 'transactionId' as const,
        message: 'x',
      },
    ]
    const error = new MappingIncompleteError(missing)

    expect(error).toMatchObject({ status: 422, code: 'mapping_incomplete', details: { missing } })
  })

  it('ImportTooLargeError is 422 import_too_large with rows and limit', () => {
    const error = new ImportTooLargeError(100_001, 100_000)

    expect(error).toMatchObject({ status: 422, code: 'import_too_large', details: { rows: 100_001, limit: 100_000 } })
    expect(error.message).toMatch(/100001/)
  })

  it('ImportNotCancellableError is 409 import_not_cancellable with the status', () => {
    expect(new ImportNotCancellableError('processed')).toMatchObject({
      status: 409,
      code: 'import_not_cancellable',
      details: { status: 'processed' },
    })
  })

  it('RowNotAmbiguousError is 409 row_not_ambiguous with the match result', () => {
    expect(new RowNotAmbiguousError('matched')).toMatchObject({
      status: 409,
      code: 'row_not_ambiguous',
      details: { matchResult: 'matched' },
    })
  })

  it('MappingShapeError is 400 validation_error naming the sheet and the conflicting field', () => {
    const error = new MappingShapeError('Column "Reference" is not in the sheet header', {
      sheetId: '00000000-0000-4000-8000-000000000001',
      sheetName: 'APP',
      sourceColumn: 'Reference',
    })

    expect(error).toMatchObject({
      status: 400,
      code: 'validation_error',
      details: { sheetId: '00000000-0000-4000-8000-000000000001', sheetName: 'APP', sourceColumn: 'Reference' },
    })
  })

  it('CandidateNotFoundError is 400 validation_error listing the candidates', () => {
    const candidates = [{ gatewayId: 1 }, { gatewayId: 3 }]
    const error = new CandidateNotFoundError(2, candidates)

    expect(error).toMatchObject({ status: 400, code: 'validation_error', details: { gatewayId: 2, candidates } })
  })
})

// README §3.3 "Batch sin filas asociadas" (#92) and §4.2 file limit (#40).
describe('guardrail errors', () => {
  it('ImportFileLimitReachedError is 409 import_file_limit_reached with the limit, the current files and the added ones', () => {
    const error = new ImportFileLimitReachedError(10, 9, 2)

    expect(error).toBeInstanceOf(DomainError)
    expect(error).toMatchObject({
      status: 409,
      code: 'import_file_limit_reached',
      details: { limit: 10, current: 9, adding: 2 },
    })
    expect(error.message).toMatch(/10 files/)
  })

  it('NoMatchedRowsError is 409 no_matched_rows carrying the empty batch details, in English', () => {
    const details = {
      rowsTotal: 12,
      rowsUnmatched: 12,
      unmatchedByReason: { no_match: 0, id_format: 12, lossy_numeric_id: 0, no_gateways: 0 },
      likelyWrongAccount: true,
    }
    const error = new NoMatchedRowsError(details)

    expect(error).toBeInstanceOf(DomainError)
    expect(error).toMatchObject({ status: 409, code: 'no_matched_rows', details })
    expect(error.message).toMatch(/confirm/i)
  })
})
