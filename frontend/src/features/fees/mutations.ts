// Writes of the fee screens (web-admin-fees design D9). The answer is painted at once in the list of the account,
// then every read of fees is asked again: the global view, the histories and the presets of Settlement Review.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type AccountFee, createFee, type FeeCreateBody, type FeePatchBody, patchFee } from './contract'
import { accountFeesKey, accountFeesQuery, FEES_KEY } from './queries'

export type FeeWrite = { kind: 'create'; body: FeeCreateBody } | { kind: 'patch'; feeId: string; body: FeePatchBody }

/** The fees of the account with the written ones replaced in place and the new ones at the end. */
function merge(list: AccountFee[] | undefined, written: AccountFee[]): AccountFee[] | undefined {
  if (!list) return list
  const byId = new Map(written.map((fee) => [fee.feeId, fee]))
  const kept = list.map((fee) => byId.get(fee.feeId) ?? fee)
  const added = written.filter((fee) => !list.some((f) => f.feeId === fee.feeId))
  return [...kept, ...added]
}

export function useFeeWrite(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (write: FeeWrite): Promise<AccountFee[]> => {
      if (write.kind === 'create') return [await createFee(accountId, write.body)]
      const { fee, successor } = await patchFee(write.feeId, write.body)
      return successor ? [fee, successor] : [fee]
    },
    onSuccess: async (written) => {
      queryClient.setQueryData(accountFeesQuery(accountId).queryKey, (list) => merge(list, written))
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accountFeesKey(accountId) }),
        queryClient.invalidateQueries({ queryKey: FEES_KEY }),
      ])
    },
  })
}

/** The list of the account is stale (a 409 fee_in_use, a 404): ask for it again. */
export function useRefreshAccountFees(accountId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: accountFeesKey(accountId) })
}
