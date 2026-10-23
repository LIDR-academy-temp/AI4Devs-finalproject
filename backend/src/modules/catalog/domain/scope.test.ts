import { describe, expect, it } from 'vitest'
import type { AuthContext } from '../../auth/domain/permissions.js'
import { scopeOf } from './scope.js'

function auth(overrides: Partial<AuthContext>): AuthContext {
  return {
    userId: 1,
    userName: 'someone',
    role: 'viewer',
    permissions: new Set(),
    merchantScope: 'assigned',
    merchantIds: [],
    ...overrides,
  }
}

describe('scopeOf', () => {
  it('takes every merchant of a user with scope "all"', () => {
    expect(scopeOf(auth({ merchantScope: 'all', merchantIds: [1, 2] })).merchantIds).toEqual([1, 2])
  })

  it('takes only the assigned merchants of a user with scope "assigned"', () => {
    expect(scopeOf(auth({ merchantIds: [1] })).merchantIds).toEqual([1])
  })

  it('is empty for a user without assigned merchants (never the whole catalog)', () => {
    expect(scopeOf(auth({ merchantIds: [] })).merchantIds).toEqual([])
  })

  it('does not share the array with the auth context', () => {
    const context = auth({ merchantIds: [1] })
    const scope = scopeOf(context)
    context.merchantIds.push(2)

    expect(scope.merchantIds).toEqual([1])
  })
})
