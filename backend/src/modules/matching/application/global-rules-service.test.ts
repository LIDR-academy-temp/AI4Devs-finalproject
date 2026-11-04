import { type GlobalMatchingRules, GlobalMatchingRulesPut } from '@recon/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { MatchingRuleError } from '../domain/errors.js'
import { InMemoryGlobalRules } from './__fakes__/in-memory-global-rules.js'
import { GlobalRulesService } from './global-rules-service.js'

// Spec matching (admin-matching): "Reglas globales editables", "Filas a ignorar de solo lectura" and "Auditoría de
// las reglas de pareo" (globals), over the in-memory double (design D3, D4, D6).

const ADMIN = 1
let repo: InMemoryGlobalRules
let service: GlobalRulesService

beforeEach(() => {
  repo = new InMemoryGlobalRules()
  service = new GlobalRulesService(repo)
})

/** What the editor sends back: the GET without rule ids, row ignores nor statuses. */
function bodyOf(globals: GlobalMatchingRules, overrides: Record<string, unknown> = {}): GlobalMatchingRulesPut {
  return GlobalMatchingRulesPut.parse({
    sheetRules: globals.sheetRules.map(({ sheetRuleId: _, ...r }) => r),
    columnRules: globals.columnRules.map(({ columnRuleId: _, ...r }) => r),
    statusAliases: globals.statusAliases,
    ...overrides,
  })
}

const approvedOk = { alias: 'Approved OK', statusId: 2, excludeAmount: false, isLegacy: false }

describe('get', () => {
  it('answers the global rules, the read-only row ignore, the aliases by text and the six statuses', async () => {
    const globals = await service.get()

    expect(globals.sheetRules.map((r) => r.sheetPattern)).toContain('RR')
    expect(globals.columnRules[0]).toMatchObject({ columnPattern: 'ID', targetField: 'transactionId' })
    expect(globals.rowIgnoreRules).toEqual([
      expect.objectContaining({ pattern: 'transactionId:empty', isRegex: false }),
    ])
    expect(globals.statusAliases.find((a) => a.alias === 'CHB 2')).toMatchObject({ excludeAmount: true })
    expect(globals.statuses).toHaveLength(6)
  })
})

describe('put', () => {
  it('answers the same document without writing: same rule ids and no audit', async () => {
    const before = await service.get()

    const after = await service.put(ADMIN, bodyOf(before))

    expect(after).toEqual(before)
    expect(repo.audits).toEqual([])
  })

  it('adds an alias and audits only the aliases, with the reason', async () => {
    const before = await service.get()

    const after = await service.put(
      ADMIN,
      bodyOf(before, { statusAliases: [...before.statusAliases, approvedOk], reason: 'New provider wording' }),
    )

    expect(after.statusAliases.map((a) => a.alias)).toEqual(['Approved OK', 'CHB 2', 'Successful'])
    expect(after.sheetRules).toEqual(before.sheetRules)
    expect(repo.audits).toHaveLength(1)
    expect(repo.audits[0]!.userId).toBe(ADMIN)
    const detail = repo.audits[0]!.detail as { changes: Record<string, unknown>; reason: string }
    expect(Object.keys(detail.changes)).toEqual(['statusAliases'])
    expect(detail.reason).toBe('New provider wording')
  })

  it('replaces a sheet rule with new ids and never touches the row ignores', async () => {
    const before = await service.get()
    const sheetRules = bodyOf(before).sheetRules.map((r) => (r.sheetPattern === 'DEC' ? { ...r, priority: 20 } : r))

    const after = await service.put(ADMIN, bodyOf(before, { sheetRules }))

    expect(after.sheetRules.find((r) => r.sheetPattern === 'DEC')?.priority).toBe(20)
    const oldIds = new Set(before.sheetRules.map((r) => r.sheetRuleId))
    expect(after.sheetRules.some((r) => oldIds.has(r.sheetRuleId))).toBe(false)
    expect(after.columnRules).toEqual(before.columnRules)
    expect(after.rowIgnoreRules).toEqual(before.rowIgnoreRules)
    expect(Object.keys((repo.audits[0]!.detail as { changes: object }).changes)).toEqual(['sheetRules'])
  })

  it('answers 400 at the second of two repeated aliases, writing nothing', async () => {
    const before = await service.get()
    const statusAliases = [
      { ...approvedOk, alias: 'CHB', statusId: 4 },
      ...before.statusAliases,
      { ...approvedOk, alias: ' chb ', statusId: 4 },
    ]

    await expect(service.put(ADMIN, bodyOf(before, { statusAliases }))).rejects.toMatchObject({
      constructor: MatchingRuleError,
      details: { field: 'statusAliases[3].alias' },
    })
    expect(await service.get()).toEqual(before)
    expect(repo.audits).toEqual([])
  })

  it('answers 400 at the statusId of an alias of an unknown status', async () => {
    const before = await service.get()

    await expect(
      service.put(ADMIN, bodyOf(before, { statusAliases: [{ ...approvedOk, statusId: 99 }] })),
    ).rejects.toMatchObject({ details: { field: 'statusAliases[0].statusId' } })
  })

  it('validates the sheet and column rules as for a set', async () => {
    const before = await service.get()
    const sheetRules = bodyOf(before).sheetRules.map((r) => (r.sheetPattern === 'APP' ? { ...r, statusId: 4 } : r))
    const columnRules = [...bodyOf(before).columnRules, { ...bodyOf(before).columnRules[0]!, columnPattern: ' id ' }]

    await expect(service.put(ADMIN, bodyOf(before, { sheetRules }))).rejects.toMatchObject({
      details: { field: 'sheetRules[0].statusId' },
    })
    await expect(service.put(ADMIN, bodyOf(before, { columnRules }))).rejects.toMatchObject({
      details: { field: 'columnRules[3].columnPattern' },
    })
  })

  it('takes the global lock for every write, a no-op included', async () => {
    const before = await service.get()

    await service.put(ADMIN, bodyOf(before))

    expect(repo.locks).toBe(1)
  })
})
