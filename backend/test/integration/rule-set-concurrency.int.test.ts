import type { GlobalMatchingRules, GlobalMatchingRulesPut, MatchingRuleSetPut } from '@recon/shared'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { GlobalRulesService } from '../../src/modules/matching/application/global-rules-service.js'
import { RuleSetAdminService } from '../../src/modules/matching/application/rule-set-admin-service.js'
import { RuleSetNameTakenError } from '../../src/modules/matching/domain/errors.js'
import { PrismaGlobalRulesRepository } from '../../src/modules/matching/infrastructure/prisma-global-rules-repository.js'
import { PrismaMatchingRulesAdminRepository } from '../../src/modules/matching/infrastructure/prisma-matching-rules-admin-repository.js'
import { createPrismaClient, fixtureIds } from './helpers.js'

// admin-matching design D3 and the accepted risk "Última escritura gana": two edits of the same set run one after the
// other (UPDLOCK, HOLDLOCK on the set row), so the result is the second document whole, never a mix, and both are
// audited; two creations with the same name leave one set (the unique index backstop); two edits of the global rules
// run one after the other too (sp_getapplock). A gate holds the first write after its decision and before its first
// write. The global rules are written back as found.
const prisma = createPrismaClient()
const ALL = { merchantIds: [1, 2] }
const RUN = Date.now().toString(36)
const PREFIX = `it-rs-conc-${RUN}`
let adminId: number

beforeAll(async () => {
  adminId = (await prisma.user.findUniqueOrThrow({ where: { userName: 'admin' } })).userId
})

afterEach(async () => {
  const sets = await prisma.matchingRuleSet.findMany({
    where: { name: { startsWith: PREFIX } },
    select: { ruleSetId: true },
  })
  const ids = fixtureIds(
    sets.map((s) => s.ruleSetId),
    'concurrency sets',
  )
  if (ids.length === 0) return
  await prisma.auditLog.deleteMany({ where: { entityType: 'MatchingRuleSet', entityId: { in: ids.map(String) } } })
  await prisma.matchingSheetRule.deleteMany({ where: { ruleSetId: { in: ids } } })
  await prisma.matchingColumnRule.deleteMany({ where: { ruleSetId: { in: ids } } })
  await prisma.matchingRuleSet.deleteMany({ where: { ruleSetId: { in: ids } } })
})

afterAll(async () => {
  try {
    expect(await prisma.matchingRuleSet.count({ where: { name: { startsWith: 'it-rs-' } } })).toBe(0)
  } finally {
    await prisma.$disconnect()
  }
})

function gate() {
  let open!: () => void
  const opened = new Promise<void>((resolve) => {
    open = resolve
  })
  return { open, opened }
}

/** A service whose first write stops after its decision until `hold` opens; `decided` opens when it gets there. */
function heldService() {
  const hold = gate()
  const decided = gate()
  let calls = 0
  const repo = new PrismaMatchingRulesAdminRepository(prisma, undefined, {
    beforeWrite: async () => {
      if (++calls === 1) {
        decided.open()
        await hold.opened
      }
    },
  })
  return { service: new RuleSetAdminService(repo), hold, decided }
}

const sheets = (...patterns: string[]) =>
  patterns.map((sheetPattern) => ({
    sheetPattern,
    isRegex: false,
    kind: 'transactions' as const,
    cycle: 'E' as const,
    statusId: null,
    priority: 10,
    isActive: true,
  }))

describe('two simultaneous PUTs of the same set', () => {
  it('run one after the other: the second document stays whole and both are audited', async () => {
    const plain = new RuleSetAdminService(new PrismaMatchingRulesAdminRepository(prisma))
    const set = await plain.create(ALL, adminId, 201, {
      name: `${PREFIX}-put`,
      sheetRules: sheets('Start'),
      columnRules: [],
    })
    const doc = (name: string, ...patterns: string[]): MatchingRuleSetPut => ({
      name,
      isActive: true,
      sheetRules: sheets(...patterns),
      columnRules: [],
    })
    const { service, hold, decided } = heldService()
    const commits: string[] = []

    const first = service
      .put(ALL, adminId, set.ruleSetId, doc(`${PREFIX}-a`, 'A1', 'A2'))
      .then(() => commits.push('first'))
    await decided.opened
    const second = service
      .put(ALL, adminId, set.ruleSetId, doc(`${PREFIX}-b`, 'B1', 'B2', 'B3'))
      .then(() => commits.push('second'))
    // With the set lock the second waits for the first; without it, it commits now while the first is held.
    await Promise.race([second, new Promise((resolve) => setTimeout(resolve, 500))])
    const duringHold = [...commits]
    // Always release the first before any assertion, so a failure never leaves its transaction waiting on the gate.
    hold.open()
    await Promise.all([first, second])

    expect(duringHold).toEqual([])
    expect(commits).toEqual(['first', 'second'])
    const stored = await prisma.matchingSheetRule.findMany({
      where: { ruleSetId: set.ruleSetId },
      orderBy: { sheetRuleId: 'asc' },
    })
    expect(stored.map((r) => r.sheetPattern)).toEqual(['B1', 'B2', 'B3'])
    const audits = await prisma.auditLog.findMany({
      where: { entityType: 'MatchingRuleSet', entityId: String(set.ruleSetId) },
      orderBy: { auditId: 'asc' },
    })
    expect(audits.map((a) => a.action)).toEqual([
      'matching_rule_set.create',
      'matching_rule_set.update',
      'matching_rule_set.update',
    ])
    // The second compared against the first's document, read under the lock.
    expect(JSON.parse(audits[2]!.detailJson!).changes.name).toEqual({ before: `${PREFIX}-a`, after: `${PREFIX}-b` })
  })
})

describe('two simultaneous creations with the same name', () => {
  it('one answers 201 and the other 409 rule_set_name_taken; one set stays', async () => {
    const { service, hold, decided } = heldService()
    const body = { name: `${PREFIX}-same`, sheetRules: [], columnRules: [] }

    const first = service.create(ALL, adminId, 201, body).catch((e: unknown) => e)
    await decided.opened
    // The second decides after the first and inserts while the first is held: both passed the check.
    const second = await service
      .create(ALL, adminId, 201, body)
      .catch((e: unknown) => e)
      .finally(() => hold.open())
    const outcomes = [second, await first]

    expect(outcomes.filter((o) => o instanceof RuleSetNameTakenError)).toHaveLength(1)
    expect(outcomes.filter((o) => (o as { name?: string }).name === body.name)).toHaveLength(1)
    expect(await prisma.matchingRuleSet.count({ where: { name: body.name } })).toBe(1)
  })
})

/** The GET as a PUT body: without rule ids, row ignores nor statuses. */
const globalBody = (g: GlobalMatchingRules, extraAlias?: string): GlobalMatchingRulesPut => ({
  sheetRules: g.sheetRules.map(({ sheetRuleId: _, ...r }) => r),
  columnRules: g.columnRules.map(({ columnRuleId: _, ...r }) => r),
  statusAliases:
    extraAlias === undefined
      ? g.statusAliases
      : [...g.statusAliases, { alias: extraAlias, statusId: 2, excludeAmount: false, isLegacy: false }],
})

describe('two simultaneous PUTs of the global rules', () => {
  it('run one after the other under the application lock: the second document stays whole', async () => {
    const plain = new GlobalRulesService(new PrismaGlobalRulesRepository(prisma))
    const original = await plain.get()
    const lastAuditId = (await prisma.auditLog.aggregate({ _max: { auditId: true } }))._max.auditId ?? 0n
    const hold = gate()
    const decided = gate()
    let calls = 0
    const held = new GlobalRulesService(
      new PrismaGlobalRulesRepository(prisma, undefined, {
        beforeWrite: async () => {
          if (++calls === 1) {
            decided.open()
            await hold.opened
          }
        },
      }),
    )
    const commits: string[] = []
    try {
      const first = held.put(adminId, globalBody(original, 'it-conc-a')).then(() => commits.push('first'))
      await decided.opened
      const second = held.put(adminId, globalBody(original, 'it-conc-b')).then(() => commits.push('second'))
      // With the lock the second waits for the first; without it, it commits now while the first is held.
      await Promise.race([second, new Promise((resolve) => setTimeout(resolve, 500))])
      const duringHold = [...commits]
      hold.open()
      await Promise.all([first, second])

      expect(duringHold).toEqual([])
      expect(commits).toEqual(['first', 'second'])
      const aliases = (await plain.get()).statusAliases.map((a) => a.alias)
      expect(aliases).toContain('it-conc-b')
      expect(aliases).not.toContain('it-conc-a')
      const audits = await prisma.auditLog.findMany({
        where: { entityType: 'MatchingRules', entityId: 'global', auditId: { gt: lastAuditId } },
      })
      expect(audits).toHaveLength(2)
    } finally {
      hold.open()
      await plain.put(adminId, globalBody(original))
      await prisma.auditLog.deleteMany({
        where: { entityType: 'MatchingRules', entityId: 'global', auditId: { gt: lastAuditId } },
      })
      expect(globalBody(await plain.get())).toEqual(globalBody(original))
    }
  })
})
