// Prisma adapter of MatchingRulesRepository: the active rules of the linked rule set, the active global
// rules (ruleSetId NULL), the global aliases and the status catalog, in precedence order (design D7, D12).
import { Cycle, SheetKind, TargetField } from '@recon/shared'
import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js'
import type { MatchingRulesRepository } from '../application/ports.js'
import type { ColumnRule, MatchingRules, RuleSet, SheetRule } from '../domain/rules.js'

const sheetRuleSelect = {
  sheetRuleId: true,
  sheetPattern: true,
  isRegex: true,
  kind: true,
  cycle: true,
  statusId: true,
  priority: true,
  isActive: true,
} satisfies Prisma.MatchingSheetRuleSelect

const columnRuleSelect = {
  columnRuleId: true,
  sheetPattern: true,
  columnPattern: true,
  isRegex: true,
  targetField: true,
  priority: true,
  isActive: true,
} satisfies Prisma.MatchingColumnRuleSelect

type SheetRuleRow = Prisma.MatchingSheetRuleGetPayload<{ select: typeof sheetRuleSelect }>
type ColumnRuleRow = Prisma.MatchingColumnRuleGetPayload<{ select: typeof columnRuleSelect }>

const sheetRuleOrder: Prisma.MatchingSheetRuleOrderByWithRelationInput[] = [{ priority: 'asc' }, { sheetRuleId: 'asc' }]
const columnRuleOrder: Prisma.MatchingColumnRuleOrderByWithRelationInput[] = [
  { priority: 'asc' },
  { columnRuleId: 'asc' },
]

// The CHECK constraints guarantee the vocabulary; an unexpected value is a data error, not a silent default.
function toSheetRule(row: SheetRuleRow): SheetRule {
  return { ...row, kind: SheetKind.parse(row.kind), cycle: row.cycle === null ? null : Cycle.parse(row.cycle) }
}

function toColumnRule(row: ColumnRuleRow): ColumnRule {
  return { ...row, targetField: TargetField.parse(row.targetField) }
}

export class PrismaMatchingRulesRepository implements MatchingRulesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async rulesFor(ruleSetId: number | null): Promise<MatchingRules> {
    const [accountSet, globalSheetRules, globalColumnRules, aliases, statuses] = await Promise.all([
      ruleSetId === null
        ? null
        : this.prisma.matchingRuleSet.findUnique({
            where: { ruleSetId },
            select: {
              ruleSetId: true,
              name: true,
              sheetRules: { where: { isActive: true }, select: sheetRuleSelect, orderBy: sheetRuleOrder },
              columnRules: { where: { isActive: true }, select: columnRuleSelect, orderBy: columnRuleOrder },
            },
          }),
      this.prisma.matchingSheetRule.findMany({
        where: { ruleSetId: null, isActive: true },
        select: sheetRuleSelect,
        orderBy: sheetRuleOrder,
      }),
      this.prisma.matchingColumnRule.findMany({
        where: { ruleSetId: null, isActive: true },
        select: columnRuleSelect,
        orderBy: columnRuleOrder,
      }),
      this.prisma.matchingStatusAlias.findMany({ select: { alias: true, statusId: true, excludeAmount: true } }),
      this.prisma.transactionStatus.findMany({
        select: { statusId: true, name: true, cycle: true },
        orderBy: { statusId: 'asc' },
      }),
    ])

    const account: RuleSet | null = accountSet
      ? {
          ruleSetId: accountSet.ruleSetId,
          name: accountSet.name,
          sheetRules: accountSet.sheetRules.map(toSheetRule),
          columnRules: accountSet.columnRules.map(toColumnRule),
        }
      : null
    const global: RuleSet = {
      ruleSetId: null,
      name: null,
      sheetRules: globalSheetRules.map(toSheetRule),
      columnRules: globalColumnRules.map(toColumnRule),
    }
    return {
      account,
      global,
      aliases,
      statuses: statuses.map((s) => ({ ...s, cycle: Cycle.parse(s.cycle) })),
    }
  }
}
