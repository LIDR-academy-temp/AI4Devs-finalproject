// The MVP screen map of README §1.3 and the permission each entry needs (design D5, README §4.4).
// An entry without `to` is not built yet: it is shown disabled. Roadmap screens are not listed.
import type { Permission } from '@/lib/api/types'
import { strings } from './strings'

export interface NavItem {
  label: string
  to?:
    | '/'
    | '/accounts'
    | '/channel-assignment'
    | '/fees'
    | '/matching-rules'
    | '/reconciliations/new'
    | '/reconciliations/in-progress'
    | '/settlements'
  /** Other paths where the entry is also the active one (the screens it leads to); `to` itself is matched exactly. */
  activeWhen?: (pathname: string) => boolean
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
        activeWhen: (pathname) => pathname.startsWith('/imports/'),
        requires: 'settlement.process',
      },
      { label: s.inProgress, to: '/reconciliations/in-progress', requires: 'settlement.process' },
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
      // The detail of an account, with every tab (its fees too), belongs to Accounts (web-admin-accounts design D2).
      {
        label: s.accounts,
        to: '/accounts',
        activeWhen: (pathname) => /^\/accounts\/[^/]+(\/fees)?\/?$/.test(pathname),
      },
      { label: s.fees, to: '/fees', requires: 'fee.view' },
      { label: s.channelAssignment, to: '/channel-assignment' },
      // No permission: every role reads the rules (web-admin-matching design D2).
      {
        label: s.matchingRules,
        to: '/matching-rules',
        activeWhen: (pathname) => pathname.startsWith('/matching-rules/'),
      },
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
