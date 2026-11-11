import type { MatchingRuleSetDetail, MatchingRuleSetSummary } from '@recon/shared'
import { NotFoundError } from '../../../shared/errors.js'
import type { Scope } from '../../catalog/domain/scope.js'
import type { RuleSetReadRepository } from './ports.js'

/** Reads of the matching rule sets (spec matching, admin-accounts design D8). The writes are RuleSetAdminService. */
export class RuleSetReadService {
  constructor(private readonly repository: RuleSetReadRepository) {}

  /** The sets of a provider; 404 when the provider is unknown or out of scope (README §4: never 403). */
  async listForProvider(scope: Scope, providerId: number): Promise<MatchingRuleSetSummary[]> {
    const sets = await this.repository.listForProvider(scope, providerId)
    if (sets === null) throw new NotFoundError('Provider')
    return sets
  }

  /** The detail of a set (admin-matching design D4); 404 when it is unknown or its provider is out of scope. */
  async detail(scope: Scope, ruleSetId: number): Promise<MatchingRuleSetDetail> {
    const detail = await this.repository.findDetail(scope, ruleSetId)
    if (detail === null) throw new NotFoundError('Rule set')
    return detail
  }
}
