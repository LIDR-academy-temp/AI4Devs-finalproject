import argon2 from 'argon2'
import { beforeAll, describe, expect, it } from 'vitest'
import { Argon2PasswordHasher } from './argon2-password-hasher.js'

let hasher: Argon2PasswordHasher
let hash: string

beforeAll(async () => {
  hasher = await Argon2PasswordHasher.create()
  hash = await argon2.hash('Correct-Horse-1')
})

describe('Argon2PasswordHasher', () => {
  it('accepts the right password', async () => {
    expect(await hasher.verify('Correct-Horse-1', hash)).toBe(true)
  })

  it('rejects a wrong password', async () => {
    expect(await hasher.verify('wrong', hash)).toBe(false)
  })

  it('always rejects against the dummy hash (unknown user)', async () => {
    expect(await hasher.verify('Correct-Horse-1', null)).toBe(false)
    expect(await hasher.verify('', null)).toBe(false)
  })

  it('treats a malformed stored hash as a mismatch', async () => {
    expect(await hasher.verify('Correct-Horse-1', 'not-a-hash')).toBe(false)
  })
})
