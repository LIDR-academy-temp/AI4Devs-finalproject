// What the Matching Rules screens offer by permission (web-admin-matching design D8). Presentation only: the API
// enforces it and its 403 is shown as a message of the form.
import { useMe } from '@/lib/session/me'

/** Create, edit, rename, deactivate and activate the rule sets of the scope. */
export function useCanManageRules(): boolean {
  return useMe().permissions.includes('account.manage')
}

/** The global rules apply to every account without a set, so they also need the scope all. */
export function useCanEditGlobals(): boolean {
  const me = useMe()
  return me.permissions.includes('account.manage') && me.merchantScope === 'all'
}
