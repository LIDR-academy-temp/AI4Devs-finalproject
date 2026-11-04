// The global matching rules (admin-matching design D3, D4). A write holds the application lock
// 'matching_rules_global' for its transaction: there is no row to lock, and two edits must run one after the other.
// The sheet and column rules with ruleSetId NULL and the aliases of each list that changes are replaced whole, in
// body order; MatchingRowIgnoreRule is never touched (#120). The audit entry goes inside the same transaction.
import type { GlobalMatchingRules } from '@recon/shared'
import type { FastifyBaseLogger } from 'fastify'
import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js'
import { retryOnDeadlock } from '../../../infrastructure/deadlock-retry.js'
import { isDuplicateKey } from '../../../infrastructure/duplicate-key.js'
import type { GlobalRulesAdminUnit, GlobalRulesRepository } from '../application/ports.js'
import { MatchingRuleError } from '../domain/errors.js'
import { columnRuleOf, type GlobalRulesDocument, sheetRuleOf, statusAliasOf } from '../domain/rule-diff.js'
import {
  columnRuleOrder,
  columnRuleSelect,
  sheetRuleOrder,
  sheetRuleSelect,
  toColumnRule,
  toSheetRule,
} from './prisma-matching-rules-repository.js'
import { readStatusCatalog } from './prisma-status-catalog.js'

type Tx = Prisma.TransactionClient
type Client = Pick<
  Prisma.TransactionClient,
  'matchingSheetRule' | 'matchingColumnRule' | 'matchingRowIgnoreRule' | 'matchingStatusAlias' | 'transactionStatus'
>

/** A waiting write holds the transaction while the other one commits; the timeout of the other rule writes. */
const TX_TIMEOUT_MS = 15_000
const GLOBAL_LOCK = 'matching_rules_global'
/**
 * How long a write waits for the lock: shorter than the transaction, so a write that cannot get it fails with the
 * lock's answer (a negative result) before the transaction times out.
 */
const LOCK_TIMEOUT_MS = 10_000

async function readGlobals(client: Client): Promise<GlobalMatchingRules> {
  const [sheetRules, columnRules, rowIgnoreRules, statusAliases, statuses] = await Promise.all([
    client.matchingSheetRule.findMany({ where: { ruleSetId: null }, select: sheetRuleSelect, orderBy: sheetRuleOrder }),
    client.matchingColumnRule.findMany({
      where: { ruleSetId: null },
      select: columnRuleSelect,
      orderBy: columnRuleOrder,
    }),
    client.matchingRowIgnoreRule.findMany({
      where: { ruleSetId: null },
      select: { rowIgnoreId: true, pattern: true, isRegex: true, description: true, isActive: true },
      orderBy: { rowIgnoreId: 'asc' },
    }),
    client.matchingStatusAlias.findMany({
      select: { alias: true, statusId: true, excludeAmount: true, isLegacy: true },
      orderBy: { alias: 'asc' },
    }),
    readStatusCatalog(client),
  ])
  return {
    sheetRules: sheetRules.map(toSheetRule),
    columnRules: columnRules.map(toColumnRule),
    rowIgnoreRules,
    statusAliases,
    statuses,
  }
}

/**
 * The unique keys a global write can hit, as 400 at the list: UX_MatchingSheetRule_global_pattern and the alias
 * primary key. The validation rejects repetitions first (same trim and case rule); this covers what it cannot see.
 */
async function backstop<T>(field: string, write: Promise<T>): Promise<T> {
  try {
    return await write
  } catch (error) {
    if (isDuplicateKey(error)) throw new MatchingRuleError(field, 'A pattern of the list is repeated')
    throw error
  }
}

export interface GlobalRulesRepositoryHooks {
  /** Test hook: awaited once per unit of work, after the use case decided and before its first write. */
  beforeWrite?: () => Promise<void>
}

export class PrismaGlobalRulesRepository implements GlobalRulesRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly log?: Pick<FastifyBaseLogger, 'warn'>,
    private readonly hooks: GlobalRulesRepositoryHooks = {},
  ) {}

  globals(): Promise<GlobalMatchingRules> {
    return readGlobals(this.prisma)
  }

  inGlobals<T>(work: (unit: GlobalRulesAdminUnit, current: GlobalRulesDocument) => Promise<T>): Promise<T> {
    return retryOnDeadlock(
      () =>
        this.prisma.$transaction(
          async (tx) => {
            const [{ result }] = await tx.$queryRaw<{ result: number }[]>`
              DECLARE @result INT;
              EXEC @result = sp_getapplock @Resource = ${GLOBAL_LOCK}, @LockMode = 'Exclusive',
                @LockOwner = 'Transaction', @LockTimeout = ${LOCK_TIMEOUT_MS};
              SELECT @result AS result;`
            // 0 granted, 1 granted after waiting; negative: timeout, cancelled, deadlock victim or error.
            if (result === undefined || result < 0) throw new Error(`sp_getapplock ${GLOBAL_LOCK} answered ${result}`)
            const read = await readGlobals(tx)
            const current: GlobalRulesDocument = {
              sheetRules: read.sheetRules.map(sheetRuleOf),
              columnRules: read.columnRules.map(columnRuleOf),
              statusAliases: read.statusAliases.map(statusAliasOf),
            }
            return work(unitOf(tx, this.hooks), current)
          },
          { timeout: TX_TIMEOUT_MS },
        ),
      {
        log: this.log,
        context: { resource: GLOBAL_LOCK },
        message: 'global matching rule write chosen as deadlock victim, retrying',
      },
    )
  }
}

function unitOf(tx: Tx, hooks: GlobalRulesRepositoryHooks): GlobalRulesAdminUnit {
  let writing: Promise<void> | undefined
  const beforeWrite = () => {
    writing ??= hooks.beforeWrite?.() ?? Promise.resolve()
    return writing
  }
  return {
    statuses: () => readStatusCatalog(tx),

    replaceGlobals: async ({ sheetRules, columnRules, statusAliases }) => {
      await beforeWrite()
      if (sheetRules !== undefined) {
        await tx.matchingSheetRule.deleteMany({ where: { ruleSetId: null } })
        if (sheetRules.length > 0)
          await backstop(
            'sheetRules',
            tx.matchingSheetRule.createMany({ data: sheetRules.map((r) => ({ ...r, ruleSetId: null })) }),
          )
      }
      if (columnRules !== undefined) {
        await tx.matchingColumnRule.deleteMany({ where: { ruleSetId: null } })
        if (columnRules.length > 0)
          await tx.matchingColumnRule.createMany({ data: columnRules.map((r) => ({ ...r, ruleSetId: null })) })
      }
      if (statusAliases !== undefined) {
        await tx.matchingStatusAlias.deleteMany({})
        if (statusAliases.length > 0)
          await backstop('statusAliases', tx.matchingStatusAlias.createMany({ data: statusAliases }))
      }
    },

    globals: () => readGlobals(tx),

    audit: async ({ userId, detail }) => {
      await tx.auditLog.create({
        data: {
          userId,
          action: 'matching_rules.update',
          entityType: 'MatchingRules',
          entityId: 'global',
          detailJson: JSON.stringify(detail),
        },
      })
    },
  }
}
