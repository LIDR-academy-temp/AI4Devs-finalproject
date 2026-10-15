// Roles and their permission codes (README §2.5 "Perfiles y permisos", §3.2 "Acceso y auditoría").
// The seed creates exactly these rows; the backend tests use them as the oracle.
import type { PermissionCode } from './permissions.js'

export const ROLES = [
  {
    name: 'admin',
    permissions: [
      'settlement.process',
      'payment.process',
      'account.manage',
      'fee.manage',
      'fee.view',
      'reports.view',
      'user.manage',
    ],
  },
  { name: 'analyst', permissions: ['settlement.process', 'fee.view', 'reports.view'] },
  { name: 'payments', permissions: ['payment.process', 'fee.view', 'reports.view'] },
  { name: 'viewer', permissions: ['fee.view', 'reports.view'] },
] as const satisfies readonly { name: string; permissions: readonly PermissionCode[] }[]

export type RoleName = (typeof ROLES)[number]['name']
