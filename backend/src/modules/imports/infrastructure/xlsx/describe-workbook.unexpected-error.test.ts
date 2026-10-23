// The reader may hit an internal error on a hostile or odd package. Only its own zip and XML errors may
// explain the 422; anything else gets a fixed reason in the response and the real error in the log.
import { describe, expect, it, vi } from 'vitest'
import { FileUnreadableError } from '../../domain/errors.js'
import { describeWorkbook } from './describe-workbook.js'
import { buildXlsx } from './test-support.js'

vi.mock('./zip.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./zip.js')>()
  return {
    ...actual,
    readCentralDirectory: () => {
      throw new RangeError('Offset is outside the bounds of the DataView')
    },
  }
})

describe('describeWorkbook: unexpected internal errors', () => {
  it('answers a fixed file_unreadable reason, logs the real error and never echoes its message', () => {
    const log = { warn: vi.fn() }
    const bytes = buildXlsx({ sheets: [{ name: 'APP', rows: [['ID'], ['1']] }] })

    let caught: unknown
    try {
      describeWorkbook(bytes, 'odd.xlsx', { log })
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(FileUnreadableError)
    const error = caught as FileUnreadableError
    const body = JSON.stringify({ code: error.code, message: error.message, details: error.details })
    expect(body).not.toContain('DataView')
    expect(error.details).toEqual({ fileName: 'odd.xlsx' })
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(RangeError), fileName: 'odd.xlsx' }),
      expect.any(String),
    )
  })
})
