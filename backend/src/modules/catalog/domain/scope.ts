import type { AuthContext } from '../../auth/domain/permissions.js'

/**
 * Merchants the caller may see (README §4 "Autenticación y alcance"). Every catalog query takes it
 * as part of its WHERE clause, so a resource outside it never comes back and reads as "not found".
 */
export interface Scope {
  readonly merchantIds: readonly number[]
}

/** The auth context already resolved "all" to every merchant and "assigned" to the UserMerchant rows. */
export function scopeOf(auth: AuthContext): Scope {
  return { merchantIds: [...auth.merchantIds] }
}
