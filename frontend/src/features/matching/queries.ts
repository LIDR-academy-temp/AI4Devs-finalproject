// Reads of the Matching Rules screens (web-admin-matching design D3). Every answer is parsed with its schema of
// @recon/shared. The rule sets of a provider are the query of the account screens (matchingRuleSetsQuery), shared.
import { GlobalMatchingRules, MatchingRuleSetDetail } from '@recon/shared'
import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'

export { matchingRuleSetsQuery } from '@/features/accounts/queries'

export const ruleSetKey = (ruleSetId: string | number) => ['matching-rule-sets', String(ruleSetId)] as const

export const ruleSetQuery = (ruleSetId: string) =>
  queryOptions({
    queryKey: ruleSetKey(ruleSetId),
    queryFn: async () =>
      MatchingRuleSetDetail.parse(
        await unwrap(api.GET('/api/v1/matching-rule-sets/{ruleSetId}', { params: { path: { ruleSetId } } })),
      ),
  })

export const globalRulesKey = ['matching-rules', 'global'] as const

/** The global rules, their aliases and the catalog of statuses every rule screen names its statuses with. */
export const globalRulesQuery = queryOptions({
  queryKey: globalRulesKey,
  queryFn: async () => GlobalMatchingRules.parse(await unwrap(api.GET('/api/v1/matching-rules/global'))),
})
