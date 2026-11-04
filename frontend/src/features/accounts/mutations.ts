// Writes of the account screens (web-admin-accounts design D7). The answer is painted at once in the detail of the
// account, then the reads that show the account elsewhere are asked again: the accounts of its provider (the list
// of Accounts and the Fees choice), its rule sets (the accounts linked to each) and the channels (Channel Assignment
// names the primary account).
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type AccountCreateBody,
  type AccountDetail,
  type AccountPatchBody,
  createAccount,
  patchAccount,
} from './contract'
import { accountQuery } from './queries'

export type AccountWrite =
  | { kind: 'create'; providerId: number; body: AccountCreateBody }
  | { kind: 'patch'; accountId: string; body: AccountPatchBody }

export function useAccountWrite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (write: AccountWrite): Promise<AccountDetail> =>
      write.kind === 'create' ? createAccount(write.providerId, write.body) : patchAccount(write.accountId, write.body),
    onSuccess: async (account) => {
      queryClient.setQueryData(accountQuery(account.accountId).queryKey, account)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['providers', account.providerId] }),
        queryClient.invalidateQueries({ queryKey: ['channels'] }),
      ])
    },
  })
}

/** What the form showed is stale (a 404, a rule set no longer valid): ask for it again. */
export function useRefreshAccount() {
  const queryClient = useQueryClient()
  return (what: 'ruleSets' | 'account', account: { accountId?: string; providerId: number }) =>
    what === 'ruleSets'
      ? queryClient.invalidateQueries({ queryKey: ['providers', account.providerId, 'matching-rule-sets'] })
      : Promise.all([
          queryClient.invalidateQueries({ queryKey: ['providers', account.providerId] }),
          account.accountId
            ? queryClient.invalidateQueries({ queryKey: accountQuery(account.accountId).queryKey })
            : Promise.resolve(),
        ])
}
