import type { MatchingRuleSetSummary } from '@recon/shared'
import { NotFoundError } from '../../../shared/errors.js'
import type { Scope } from '../../catalog/domain/scope.js'
import type { RuleSetReadRepository } from './ports.js'

/** Reads of the matching rule sets (spec matching, admin-accounts design D8). admin-matching adds the writes. */
export class RuleSetReadService {
  constructor(private readonly repository: RuleSetReadRepository) {}

  /** The sets of a provider; 404 when the provider is unknown or out of scope (README §4: never 403). */
  async listForProvider(scope: Scope, providerId: number): Promise<MatchingRuleSetSummary[]> {
    const sets = await this.repository.listForProvider(scope, providerId)
    if (sets === null) throw new NotFoundError('Provider')
    return sets
  }
}
