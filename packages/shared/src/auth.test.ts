import { describe, expect, it } from 'vitest'
import { ErrorResponse, LoginRequest, MeResponse, MerchantScope, RefreshRequest, TokenPair } from './auth.js'

const viewerMe = {
  userId: 4,
  userName: 'viewer',
  displayName: 'Viewer',
  email: 'viewer@recon.local',
  role: 'viewer',
  permissions: ['fee.view', 'reports.view'],
  merchantScope: 'assigned',
  merchants: [{ merchantId: 1, name: 'Merchant A' }],
}

describe('LoginRequest', () => {
  it('accepts a user name and a password', () => {
    expect(LoginRequest.safeParse({ userName: 'viewer', password: 'x' }).success).toBe(true)
  })

  it.each([
    { title: 'missing userName', body: { password: 'x' } },
    { title: 'missing password', body: { userName: 'viewer' } },
    { title: 'empty userName', body: { userName: '', password: 'x' } },
    { title: 'empty password', body: { userName: 'viewer', password: '' } },
  ])('rejects $title', ({ body }) => {
    expect(LoginRequest.safeParse(body).success).toBe(false)
  })
})

describe('RefreshRequest', () => {
  it('requires a non-empty refreshToken', () => {
    expect(RefreshRequest.safeParse({ refreshToken: 'abc' }).success).toBe(true)
    expect(RefreshRequest.safeParse({ refreshToken: '' }).success).toBe(false)
    expect(RefreshRequest.safeParse({}).success).toBe(false)
  })
})

describe('TokenPair', () => {
  it('accepts access and refresh tokens with expiresIn in seconds', () => {
    expect(TokenPair.safeParse({ accessToken: 'a', refreshToken: 'r', expiresIn: 900 }).success).toBe(true)
    expect(TokenPair.safeParse({ accessToken: 'a', refreshToken: 'r' }).success).toBe(false)
  })
})

describe('MeResponse', () => {
  it("accepts viewer's identity", () => {
    expect(MeResponse.safeParse(viewerMe).success).toBe(true)
  })

  it('rejects a permission code outside PermissionCode', () => {
    expect(MeResponse.safeParse({ ...viewerMe, permissions: ['fee.view', 'god.mode'] }).success).toBe(false)
  })

  it('rejects an unknown merchantScope', () => {
    expect(MeResponse.safeParse({ ...viewerMe, merchantScope: 'some' }).success).toBe(false)
  })
})

describe('MerchantScope', () => {
  it('only allows "assigned" and "all"', () => {
    expect(MerchantScope.options).toEqual(['assigned', 'all'])
    expect(MerchantScope.safeParse('none').success).toBe(false)
  })
})

describe('ErrorResponse', () => {
  it('requires code and message and allows optional details', () => {
    expect(ErrorResponse.safeParse({ code: 'forbidden', message: 'Forbidden' }).success).toBe(true)
    expect(ErrorResponse.safeParse({ code: 'validation_error', message: 'Invalid', details: [{}] }).success).toBe(true)
    expect(ErrorResponse.safeParse({ code: 'forbidden' }).success).toBe(false)
  })
})
