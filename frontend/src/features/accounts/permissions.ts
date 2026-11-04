// What the account screens offer by permission (web-admin-accounts design D4). Presentation only: the API enforces it.
import { useMe } from '@/lib/session/me'

/** Create, edit, close and reopen accounts. */
export function useCanManageAccounts(): boolean {
  return useMe().permissions.includes('account.manage')
}

/** Start a reconciliation (New reconciliation in the header of an open account). */
export function useCanProcess(): boolean {
  return useMe().permissions.includes('settlement.process')
}
