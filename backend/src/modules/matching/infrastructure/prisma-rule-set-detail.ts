// The detail of a rule set (admin-matching design D4), one read shared by GET /matching-rule-sets/{id} and by the
// answer of the writes, which read it inside their transaction. Rules in priority order and then by id, the order
// of saving and the tie-break of the proposal; inactive rules included.
import type { MatchingRuleSetDetail } from '@recon/shared'
import type { Prisma } from '../../../generated/prisma/client.js'
import type { Scope } from '../../catalog/domain/scope.js'
import {
  columnRuleOrder,
  columnRuleSelect,
  sheetRuleOrder,
  sheetRuleSelect,
  toColumnRule,
  toSheetRule,
} from './prisma-matching-rules-repository.js'

/** A client or a transaction: both have the model delegates the read uses. */
type Client = Pick<Prisma.TransactionClient, 'matchingRuleSet'>

/** null when the set does not exist or its provider is outside the scope (no scope: inside a write already scoped). */
export async function readRuleSetDetail(
  client: Client,
  ruleSetId: number,
  scope?: Scope,
): Promise<MatchingRuleSetDetail | null> {
  const set = await client.matchingRuleSet.findFirst({
    where: { ruleSetId, ...(scope ? { provider: { merchantId: { in: [...scope.merchantIds] } } } : {}) },
    select: {
      ruleSetId: true,
      name: true,
      isActive: true,
      provider: { select: { providerId: true, name: true } },
      accounts: { select: { accountId: true, name: true, isActive: true }, orderBy: { name: 'asc' } },
      sheetRules: { select: sheetRuleSelect, orderBy: sheetRuleOrder },
      columnRules: { select: columnRuleSelect, orderBy: columnRuleOrder },
      rowIgnores: {
        select: { rowIgnoreId: true, pattern: true, isRegex: true, description: true, isActive: true },
        orderBy: { rowIgnoreId: 'asc' },
      },
    },
  })
  if (set === null) return null
  const { rowIgnores, ...rest } = set
  return {
    ...rest,
    sheetRules: set.sheetRules.map(toSheetRule),
    columnRules: set.columnRules.map(toColumnRule),
    rowIgnoreRules: rowIgnores,
  }
}
