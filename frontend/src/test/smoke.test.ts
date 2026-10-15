import { LoginRequest } from '@recon/shared'
import { describe, expect, it } from 'vitest'

// Proves that Vite resolves @recon/shared (TypeScript source with `.js` import suffixes).
describe('@recon/shared in the frontend', () => {
  it('validates a login request with the shared schema', () => {
    expect(LoginRequest.safeParse({ userName: 'analyst', password: 'x' }).success).toBe(true)
    expect(LoginRequest.safeParse({ userName: '', password: 'x' }).success).toBe(false)
  })
})
