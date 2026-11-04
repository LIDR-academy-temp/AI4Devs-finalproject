// Writes of the matching rule administration (admin-matching design D3): one transaction per write. An edit holds
// the rule set row under UPDLOCK + HOLDLOCK, so two edits of the same set run one after the other and neither mixes
// rules with the other. The rules of a list are replaced whole with one createMany in body order: the ids grow in
// that order, which is the tie-break of the proposal. The audit entry goes inside the same transaction.
import { Cycle } from '@recon/shared'
import type { FastifyBaseLogger } from 'fastify'
import { Prisma, type PrismaClient } from '../../../generated/prisma/client.js'
import { retryOnDeadlock } from '../../../infrastructure/deadlock-retry.js'
import { isDuplicateKey } from '../../../infrastructure/duplicate-key.js'
import type { Scope } from '../../catalog/domain/scope.js'
import type { MatchingRulesAdminRepository, RuleSetAdminUnit, StoredRuleSet } from '../application/ports.js'
import { RuleSetNameTakenError } from '../domain/errors.js'
import { columnRuleOf, sheetRuleOf } from '../domain/rule-diff.js'
import {
  columnRuleOrder,
  columnRuleSelect,
  sheetRuleOrder,
  sheetRuleSelect,
  toColumnRule,
  toSheetRule,
} from './prisma-matching-rules-repository.js'
import { readRuleSetDetail } from './prisma-rule-set-detail.js'

type Tx = Prisma.TransactionClient

/** A waiting write holds the transaction while the other one commits; the timeout of the fee and account writes. */
const TX_TIMEOUT_MS = 15_000

/**
 * The index's rejection as 409 rule_set_name_taken, for two writes that both passed the check. A set write can only
 * hit MatchingRuleSet_providerId_name_key: rule ids are identities and nothing else of a set is unique.
 */
async function nameBackstop<T>(write: Promise<T>): Promise<T> {
  try {
    return await write
  } catch (error) {
    if (isDuplicateKey(error)) throw new RuleSetNameTakenError()
    throw error
  }
}

export interface MatchingRulesAdminRepositoryHooks {
  /** Test hook: awaited once per unit of work, after the use case decided and before its first write. */
  beforeWrite?: () => Promise<void>
}

export class PrismaMatchingRulesAdminRepository implements MatchingRulesAdminRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly log?: Pick<FastifyBaseLogger, 'warn'>,
    private readonly hooks: MatchingRulesAdminRepositoryHooks = {},
  ) {}

  async inProvider<T>(scope: Scope, providerId: number, work: (unit: RuleSetAdminUnit) => Promise<T>) {
    if (scope.merchantIds.length === 0) return null
    return this.transaction({ providerId }, async (tx) => {
      const provider = await tx.provider.findFirst({
        where: { providerId, merchantId: { in: [...scope.merchantIds] } },
        select: { providerId: true },
      })
      return provider === null ? null : work(unitOf(tx, this.hooks))
    })
  }

  async inRuleSet<T>(
    scope: Scope,
    ruleSetId: number,
    work: (unit: RuleSetAdminUnit, current: StoredRuleSet) => Promise<T>,
  ) {
    if (scope.merchantIds.length === 0) return null
    return this.transaction({ ruleSetId }, async (tx) => {
      const locked = await tx.$queryRaw<{ ruleSetId: number }[]>`
        SELECT s.[ruleSetId]
        FROM [MatchingRuleSet] s WITH (UPDLOCK, HOLDLOCK)
        JOIN [Provider] p ON p.[providerId] = s.[providerId]
        WHERE s.[ruleSetId] = ${ruleSetId} AND p.[merchantId] IN (${Prisma.join([...scope.merchantIds])})`
      if (locked.length === 0) return null
      const row = await tx.matchingRuleSet.findUniqueOrThrow({
        where: { ruleSetId },
        select: {
          ruleSetId: true,
          providerId: true,
          name: true,
          isActive: true,
          sheetRules: { select: sheetRuleSelect, orderBy: sheetRuleOrder },
          columnRules: { select: columnRuleSelect, orderBy: columnRuleOrder },
        },
      })
      const current: StoredRuleSet = {
        ...row,
        sheetRules: row.sheetRules.map((r) => sheetRuleOf(toSheetRule(r))),
        columnRules: row.columnRules.map((r) => columnRuleOf(toColumnRule(r))),
      }
      return work(unitOf(tx, this.hooks), current)
    })
  }

  private transaction<T>(context: Record<string, unknown>, work: (tx: Tx) => Promise<T>): Promise<T> {
    return retryOnDeadlock(() => this.prisma.$transaction(work, { timeout: TX_TIMEOUT_MS }), {
      log: this.log,
      context,
      message: 'matching rule write chosen as deadlock victim, retrying',
    })
  }
}

function unitOf(tx: Tx, hooks: MatchingRulesAdminRepositoryHooks): RuleSetAdminUnit {
  let writing: Promise<void> | undefined
  const beforeWrite = () => {
    writing ??= hooks.beforeWrite?.() ?? Promise.resolve()
    return writing
  }

  const insertSheetRules = async (ruleSetId: number, rules: StoredRuleSet['sheetRules']) => {
    if (rules.length > 0) await tx.matchingSheetRule.createMany({ data: rules.map((r) => ({ ...r, ruleSetId })) })
  }
  const insertColumnRules = async (ruleSetId: number, rules: StoredRuleSet['columnRules']) => {
    if (rules.length > 0) await tx.matchingColumnRule.createMany({ data: rules.map((r) => ({ ...r, ruleSetId })) })
  }

  return {
    statuses: async () =>
      (
        await tx.transactionStatus.findMany({
          select: { statusId: true, name: true, cycle: true },
          orderBy: { statusId: 'asc' },
        })
      ).map((s) => ({ ...s, cycle: Cycle.parse(s.cycle) })),

    // The column's collation compares without case.
    nameTaken: async (providerId, name, exceptRuleSetId) =>
      (await tx.matchingRuleSet.findFirst({
        where: { providerId, name, ...(exceptRuleSetId === undefined ? {} : { NOT: { ruleSetId: exceptRuleSetId } }) },
        select: { ruleSetId: true },
      })) !== null,

    linkedAccounts: (ruleSetId) =>
      tx.account.findMany({
        where: { matchingRuleSetId: ruleSetId },
        select: { accountId: true, name: true },
        orderBy: { name: 'asc' },
      }),

    insertRuleSet: async (providerId, document) => {
      await beforeWrite()
      const { ruleSetId } = await nameBackstop(
        tx.matchingRuleSet.create({
          data: { providerId, name: document.name, isActive: document.isActive },
          select: { ruleSetId: true },
        }),
      )
      await insertSheetRules(ruleSetId, document.sheetRules)
      await insertColumnRules(ruleSetId, document.columnRules)
      return ruleSetId
    },

    updateRuleSet: async (ruleSetId, changes) => {
      await beforeWrite()
      const { sheetRules, columnRules, ...fields } = changes
      if (Object.keys(fields).length > 0)
        await nameBackstop(tx.matchingRuleSet.update({ where: { ruleSetId }, data: fields }))
      if (sheetRules !== undefined) {
        await tx.matchingSheetRule.deleteMany({ where: { ruleSetId } })
        await insertSheetRules(ruleSetId, sheetRules)
      }
      if (columnRules !== undefined) {
        await tx.matchingColumnRule.deleteMany({ where: { ruleSetId } })
        await insertColumnRules(ruleSetId, columnRules)
      }
    },

    detail: async (ruleSetId) => {
      const detail = await readRuleSetDetail(tx, ruleSetId)
      if (detail === null) throw new Error(`rule set ${ruleSetId} vanished inside its own transaction`)
      return detail
    },

    audit: async (row) => {
      await tx.auditLog.create({
        data: {
          userId: row.userId,
          action: row.action,
          entityType: 'MatchingRuleSet',
          entityId: String(row.ruleSetId),
          detailJson: JSON.stringify(row.detail),
        },
      })
    },
  }
}
