import { z } from 'zod'

export const PermissionCode = z.enum([
  'settlement.process',
  'payment.process',
  'account.manage',
  'fee.manage',
  'fee.view',
  'reports.view',
  'user.manage',
])
export type PermissionCode = z.infer<typeof PermissionCode>

/** The seven codes, in the order of README §3.2. */
export const PERMISSION_CODES = PermissionCode.options
