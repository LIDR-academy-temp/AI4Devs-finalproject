import { afterEach, describe, expect, it, vi } from 'vitest'
import './zod-config'
import { z } from 'zod'

describe('zod config', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds and parses object schemas without evaluating code', () => {
    const functionSpy = vi.spyOn(globalThis, 'Function')

    const schema = z.object({ id: z.string(), amount: z.string() })

    expect(schema.parse({ id: 'T-1', amount: '10.0000' })).toEqual({ id: 'T-1', amount: '10.0000' })
    expect(functionSpy).not.toHaveBeenCalled()
  })
})
