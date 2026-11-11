// What the fee screens offer by permission (web-admin-fees design D2). Presentation only: the API enforces it.
import { useMe } from '@/lib/session/me'

/** Create, edit, change from a date and close fees. */
export function useCanManageFees(): boolean {
  return useMe().permissions.includes('fee.manage')
}
