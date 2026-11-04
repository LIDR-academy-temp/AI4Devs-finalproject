// In-memory double of the rule set reads (admin-accounts design D8), over the synthetic world of the catalog double:
// providers 101 and 102 of merchant 1 have no set; provider 201 of merchant 2 has "Provider C legacy" with
// ProviderC-Alt, and an inactive set without accounts.
import type { MatchingRuleSetSummary } from '@recon/shared'
import { ACCOUNT_IDS, LEGACY_RULE_SET_ID } from '../../../catalog/application/__fakes__/in-memory.js'
import type { Scope } from '../../../catalog/domain/scope.js'
import type { RuleSetReadRepository } from '../ports.js'

const PROVIDER_MERCHANTS = new Map<number, number>([
  [101, 1],
  [102, 1],
  [201, 2],
])

export const RULE_SETS: MatchingRuleSetSummary[] = [
  {
    ruleSetId: LEGACY_RULE_SET_ID,
    providerId: 201,
    name: 'Provider C legacy',
    isActive: true,
    accounts: [{ accountId: ACCOUNT_IDS['ProviderC-Alt'], name: 'ProviderC-Alt', isActive: true }],
  },
  { ruleSetId: 2, providerId: 201, name: 'Provider C archive', isActive: false, accounts: [] },
]

export class InMemoryRuleSetReadRepository implements RuleSetReadRepository {
  async listForProvider(scope: Scope, providerId: number): Promise<MatchingRuleSetSummary[] | null> {
    const merchantId = PROVIDER_MERCHANTS.get(providerId)
    if (merchantId === undefined || !scope.merchantIds.includes(merchantId)) return null
    return structuredClone(
      RULE_SETS.filter((s) => s.providerId === providerId).sort((a, b) => a.name.localeCompare(b.name)),
    )
  }
}
