import { describe, expect, it } from 'vitest'
import { PERMISSION_CODES, PermissionCode } from './permissions.js'
import { ROLES, type RoleName } from './roles.js'

const ALL_CODES = [
  'account.manage',
  'fee.manage',
  'fee.view',
  'payment.process',
  'reports.view',
  'settlement.process',
  'user.manage',
]

function permissionsOf(role: RoleName): string[] {
  const found = ROLES.find((r) => r.name === role)
  if (!found) throw new Error(`role ${role} is not defined`)
  return [...found.permissions].sort()
}

describe('PERMISSION_CODES', () => {
  it('lists the seven permission codes of README §3.2', () => {
    expect([...PERMISSION_CODES].sort()).toEqual(ALL_CODES)
  })

  it('matches the PermissionCode enum', () => {
    expect([...PERMISSION_CODES]).toEqual(PermissionCode.options)
  })
})

describe('ROLES', () => {
  it('defines admin, analyst, payments and viewer, in that order', () => {
    expect(ROLES.map((r) => r.name)).toEqual(['admin', 'analyst', 'payments', 'viewer'])
  })

  it('only grants codes that PermissionCode accepts', () => {
    for (const role of ROLES) {
      for (const code of role.permissions) {
        expect(PermissionCode.safeParse(code).success).toBe(true)
      }
    }
  })

  it('grants admin every permission code', () => {
    expect(permissionsOf('admin')).toEqual([...PERMISSION_CODES].sort())
  })

  it.each([
    { role: 'analyst', permissions: ['fee.view', 'reports.view', 'settlement.process'] },
    { role: 'payments', permissions: ['fee.view', 'payment.process', 'reports.view'] },
    { role: 'viewer', permissions: ['fee.view', 'reports.view'] },
  ] as const)('$role has exactly $permissions', ({ role, permissions }) => {
    expect(permissionsOf(role)).toEqual([...permissions])
  })

  it('does not let viewer process settlements', () => {
    expect(permissionsOf('viewer')).not.toContain('settlement.process')
  })
})
