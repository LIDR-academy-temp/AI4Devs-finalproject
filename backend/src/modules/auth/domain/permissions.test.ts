import { PERMISSION_CODES, ROLES, type RoleName } from '@recon/shared'
import { describe, expect, it } from 'vitest'
import { type AuthContext, hasPermission } from './permissions.js'

function authFor(role: RoleName): AuthContext {
  const found = ROLES.find((r) => r.name === role)
  if (!found) throw new Error(`role ${role} is not defined`)
  return {
    userId: 1,
    userName: role,
    role,
    permissions: new Set(found.permissions),
    merchantScope: 'assigned',
    merchantIds: [1],
  }
}

describe('hasPermission', () => {
  it('returns true when the role grants the permission', () => {
    expect(hasPermission(authFor('analyst'), 'settlement.process')).toBe(true)
  })

  it('returns false when the role does not grant the permission', () => {
    expect(hasPermission(authFor('viewer'), 'settlement.process')).toBe(false)
  })

  it('returns false for every code when the role has no permissions', () => {
    const auth: AuthContext = { ...authFor('viewer'), permissions: new Set() }
    for (const code of PERMISSION_CODES) {
      expect(hasPermission(auth, code)).toBe(false)
    }
  })

  it('grants admin all seven permissions', () => {
    const admin = authFor('admin')
    for (const code of PERMISSION_CODES) {
      expect(hasPermission(admin, code)).toBe(true)
    }
  })
})
