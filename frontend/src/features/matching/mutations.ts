// Writes of the Matching Rules screens (web-admin-matching design D5, D7). Every answer is parsed with its schema and
// becomes the cache of what it changed, so the screen shows the order of the answer and the next edit starts from it
// (a PUT may give the rules new ids; never keep them between edits).
import {
  GlobalMatchingRules,
  type GlobalMatchingRulesPut,
  type MatchingRuleSetCreate,
  MatchingRuleSetDetail,
  type MatchingRuleSetPut,
} from '@recon/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { globalRulesKey, matchingRuleSetsQuery, ruleSetKey } from './queries'

/** PUT /matching-rule-sets/{id}: edit, rename, deactivate and activate all send the whole document. */
export function usePutRuleSet(ruleSetId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: MatchingRuleSetPut) =>
      MatchingRuleSetDetail.parse(
        await unwrap(api.PUT('/api/v1/matching-rule-sets/{ruleSetId}', { params: { path: { ruleSetId } }, body })),
      ),
    onSuccess: (detail) => {
      queryClient.setQueryData(ruleSetKey(ruleSetId), detail)
      // The list of the provider and the account forms show the name and the state of the set.
      void queryClient.invalidateQueries({ queryKey: matchingRuleSetsQuery(detail.provider.providerId).queryKey })
    },
  })
}

/** POST /providers/{id}/matching-rule-sets: the new set is cached, so its detail opens without another read. */
export function useCreateRuleSet(providerId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: MatchingRuleSetCreate) =>
      MatchingRuleSetDetail.parse(
        await unwrap(
          api.POST('/api/v1/providers/{providerId}/matching-rule-sets', {
            params: { path: { providerId: String(providerId) } },
            body,
          }),
        ),
      ),
    onSuccess: (detail) => {
      queryClient.setQueryData(ruleSetKey(detail.ruleSetId), detail)
      void queryClient.invalidateQueries({ queryKey: matchingRuleSetsQuery(providerId).queryKey })
    },
  })
}

export function usePutGlobals() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: GlobalMatchingRulesPut) =>
      GlobalMatchingRules.parse(await unwrap(api.PUT('/api/v1/matching-rules/global', { body }))),
    onSuccess: (globals) => queryClient.setQueryData(globalRulesKey, globals),
  })
}
