import { describe, expect, it } from 'vitest'
import { ApiError, unwrap } from './client'

const answer = (status: number, error?: unknown) =>
  Promise.resolve({ data: undefined, error, response: new Response(null, { status }) })

async function caught(call: Promise<unknown>): Promise<ApiError> {
  try {
    await call
  } catch (error) {
    if (error instanceof ApiError) return error
    throw error
  }
  throw new Error('expected an ApiError')
}

describe('unwrap', () => {
  it('keeps status, code and details of the error body', async () => {
    const error = await caught(
      unwrap(
        answer(409, {
          code: 'duplicate_file',
          message: 'The file is already in the import',
          details: { fileId: 'f-1', fileName: 'Recon_Template_ProviderA-USD_batch-split_part1.xlsx' },
        }),
      ),
    )

    expect(error.status).toBe(409)
    expect(error.code).toBe('duplicate_file')
    expect(error.message).toBe('The file is already in the import')
    expect(error.details).toEqual({ fileId: 'f-1', fileName: 'Recon_Template_ProviderA-USD_batch-split_part1.xlsx' })
  })

  it('gives an ApiError without details for a 500 without body', async () => {
    const error = await caught(unwrap(answer(500)))

    expect(error.status).toBe(500)
    expect(error.code).toBeUndefined()
    expect(error.details).toBeUndefined()
  })
})
