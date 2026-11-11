import type { MerchantScope, PermissionCode } from '@recon/shared'

/** Identity of the caller, resolved from the database on every request (README §2.5). */
export interface AuthContext {
  userId: number
  userName: string
  role: string
  permissions: ReadonlySet<PermissionCode>
  merchantScope: MerchantScope
  /** Merchants the user can see: every merchant for scope "all", the UserMerchant rows for "assigned". */
  merchantIds: number[]
}

export function hasPermission(auth: AuthContext, code: PermissionCode): boolean {
  return auth.permissions.has(code)
}
