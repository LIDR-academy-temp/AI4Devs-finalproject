// The MVP screen map of README §1.3 and the permission each entry needs (design D5, README §4.4).
// An entry without `to` is not built yet: it is shown disabled. Roadmap screens are not listed.
import type { Permission } from '@/lib/api/types'
import { strings } from './strings'

export interface NavItem {
  label: string
  to?: '/' | '/accounts' | '/reconciliations/new' | '/settlements'
  /** Paths under which the entry is also the active one (the screens it leads to). */
  activeUnder?: string
  requires?: Permission
}

export interface NavGroup {
  /** Absent for the top entry (Dashboard). */
  label?: string
  items: NavItem[]
}

const s = strings.screens

export const NAV: readonly NavGroup[] = [
  { items: [{ label: s.dashboard, to: '/' }] },
  {
    label: strings.groups.reconciliation,
    items: [
      {
        label: s.newReconciliation,
        to: '/reconciliations/new',
        activeUnder: '/imports/',
        requires: 'settlement.process',
      },
      { label: s.inProgress, requires: 'settlement.process' },
    ],
  },
  {
    label: strings.groups.settlements,
    items: [
      { label: s.settlementList, to: '/settlements' },
      { label: s.payments, requires: 'payment.process' },
    ],
  },
  { label: strings.groups.search, items: [{ label: s.transactionSearch }, { label: s.missingDuplicates }] },
  { label: strings.groups.reports, items: [{ label: s.unsettledPerChannel, requires: 'reports.view' }] },
  {
    label: strings.groups.administration,
    items: [
      { label: s.merchantsProviders },
      { label: s.accounts, to: '/accounts' },
      { label: s.fees, requires: 'fee.view' },
      { label: s.channelAssignment },
      { label: s.matchingRules },
      { label: s.usersRoles, requires: 'user.manage' },
      { label: s.auditLog, requires: 'user.manage' },
    ],
  },
]

/** Entries the role may see; groups left without entries disappear. Presentation only: the API enforces access. */
export function visibleNav(permissions: readonly Permission[], nav: readonly NavGroup[] = NAV): NavGroup[] {
  return nav
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.requires || permissions.includes(item.requires)),
    }))
    .filter((group) => group.items.length > 0)
}
