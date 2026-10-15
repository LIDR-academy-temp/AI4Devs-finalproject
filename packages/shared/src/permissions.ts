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
