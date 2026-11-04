// Prisma adapter of RuleSetReadRepository (admin-accounts design D8). The scope is checked on the provider, as the
// catalog does for its channels; the linked accounts belong to the same provider, hence to a merchant in scope.
import type { MatchingRuleSetDetail, MatchingRuleSetSummary } from '@recon/shared'
import type { PrismaClient } from '../../../generated/prisma/client.js'
import type { Scope } from '../../catalog/domain/scope.js'
import type { RuleSetReadRepository } from '../application/ports.js'
import { readRuleSetDetail } from './prisma-rule-set-detail.js'

export class PrismaRuleSetReadRepository implements RuleSetReadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listForProvider(scope: Scope, providerId: number): Promise<MatchingRuleSetSummary[] | null> {
    if (scope.merchantIds.length === 0) return null
    const provider = await this.prisma.provider.findFirst({
      where: { providerId, merchantId: { in: [...scope.merchantIds] } },
      select: {
        ruleSets: {
          select: {
            ruleSetId: true,
            providerId: true,
            name: true,
            isActive: true,
            accounts: { select: { accountId: true, name: true, isActive: true }, orderBy: { name: 'asc' } },
          },
          orderBy: { name: 'asc' },
        },
      },
    })
    return provider?.ruleSets ?? null
  }

  async findDetail(scope: Scope, ruleSetId: number): Promise<MatchingRuleSetDetail | null> {
    if (scope.merchantIds.length === 0) return null
    return readRuleSetDetail(this.prisma, ruleSetId, scope)
  }
}
