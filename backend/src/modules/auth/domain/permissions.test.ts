import { describe, expect, it } from 'vitest'
import { ROLES } from '../../../../prisma/synthetic.js'
import { type AuthContext, hasPermission } from './permissions.js'

const ALL_PERMISSIONS = [
  'settlement.process',
  'payment.process',
  'account.manage',
  'fee.manage',
  'fee.view',
  'reports.view',
  'user.manage',
] as const

function seededPermissions(role: string): string[] {
  const found = ROLES.find((r) => r.name === role)
  if (!found) throw new Error(`role ${role} is not seeded`)
  return [...found.permissions]
}

function authFor(role: string): AuthContext {
  return {
    userId: 1,
    userName: role,
    role,
    permissions: new Set(seededPermissions(role)) as AuthContext['permissions'],
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
    for (const code of ALL_PERMISSIONS) {
      expect(hasPermission(auth, code)).toBe(false)
    }
  })

  it('grants admin all seven permissions', () => {
    const admin = authFor('admin')
    for (const code of ALL_PERMISSIONS) {
      expect(hasPermission(admin, code)).toBe(true)
    }
  })
})

describe('seeded role permissions', () => {
  it('viewer does not include settlement.process', () => {
    expect(seededPermissions('viewer')).not.toContain('settlement.process')
  })

  it('admin includes the seven permission codes', () => {
    expect([...seededPermissions('admin')].sort()).toEqual([...ALL_PERMISSIONS].sort())
  })

  it('analyst has settlement.process, fee.view and reports.view', () => {
    expect([...seededPermissions('analyst')].sort()).toEqual(['fee.view', 'reports.view', 'settlement.process'])
  })
})
