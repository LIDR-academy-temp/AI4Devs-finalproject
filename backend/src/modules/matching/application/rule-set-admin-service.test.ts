import { MatchingRuleSetCreate, type MatchingRuleSetDetail, MatchingRuleSetPut } from '@recon/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { NotFoundError } from '../../../shared/errors.js'
import { ACCOUNT_IDS, LEGACY_RULE_SET_ID } from '../../catalog/application/__fakes__/in-memory.js'
import type { Scope } from '../../catalog/domain/scope.js'
import { MatchingRuleError, RuleSetInUseError, RuleSetNameTakenError } from '../domain/errors.js'
import { ARCHIVE_RULE_SET_ID, InMemoryRuleSets } from './__fakes__/in-memory-rule-sets.js'
import { RuleSetAdminService } from './rule-set-admin-service.js'
import { RuleSetReadService } from './rule-set-read-service.js'

// Spec matching (admin-matching): "Crear un conjunto de reglas", "Detalle de un conjunto de reglas", "Editar un
// conjunto de reglas", "Nombre de conjunto único por proveedor", "Desactivar un conjunto en uso", "Permiso y alcance
// de las escrituras de reglas" (404) and "Auditoría de las reglas de pareo", over the in-memory double (design D3).

const ALL: Scope = { merchantIds: [1, 2] }
const MERCHANT_1: Scope = { merchantIds: [1] }
const ADMIN = 1

let repo: InMemoryRuleSets
let service: RuleSetAdminService
let reads: RuleSetReadService

beforeEach(() => {
  repo = new InMemoryRuleSets()
  service = new RuleSetAdminService(repo)
  reads = new RuleSetReadService(repo)
})

const transactions = { sheetPattern: 'Transactions', isRegex: false, kind: 'transactions', cycle: 'E', statusId: null }
const txnRef = { sheetPattern: null, columnPattern: 'Txn Ref', isRegex: false, targetField: 'transactionId' }

/** The detail as a PUT body: what the editor sends back, without ids and read-only lists. */
function bodyOf(detail: MatchingRuleSetDetail, overrides: Record<string, unknown> = {}): MatchingRuleSetPut {
  return MatchingRuleSetPut.parse({
    name: detail.name,
    isActive: detail.isActive,
    sheetRules: detail.sheetRules.map(({ sheetRuleId: _, ...r }) => r),
    columnRules: detail.columnRules.map(({ columnRuleId: _, ...r }) => r),
    ...overrides,
  })
}

const legacy = () => reads.detail(ALL, LEGACY_RULE_SET_ID)

describe('create', () => {
  it('creates the set in the provider, without accounts, with its rules active, and audits it', async () => {
    const body = MatchingRuleSetCreate.parse({
      name: ' Provider C v2 ',
      sheetRules: [transactions],
      columnRules: [txnRef],
    })

    const detail = await service.create(ALL, ADMIN, 201, body)

    expect(detail).toMatchObject({
      name: 'Provider C v2',
      isActive: true,
      provider: { providerId: 201, name: 'Provider C' },
      accounts: [],
      rowIgnoreRules: [],
    })
    expect(detail.sheetRules).toEqual([expect.objectContaining({ ...transactions, priority: 100, isActive: true })])
    expect(detail.columnRules).toEqual([expect.objectContaining({ ...txnRef, priority: 100, isActive: true })])
    expect((await reads.listForProvider(ALL, 201)).map((s) => s.name)).toContain('Provider C v2')
    expect(repo.audits).toEqual([
      {
        action: 'matching_rule_set.create',
        ruleSetId: detail.ruleSetId,
        userId: ADMIN,
        detail: {
          providerId: 201,
          name: 'Provider C v2',
          isActive: true,
          sheetRules: [{ ...transactions, priority: 100, isActive: true }],
          columnRules: [{ ...txnRef, priority: 100, isActive: true }],
        },
      },
    ])
  })

  it('creates an empty set from a name only, and an inactive one when asked, with the reason audited', async () => {
    const empty = await service.create(ALL, ADMIN, 201, MatchingRuleSetCreate.parse({ name: 'Empty' }))
    const off = await service.create(
      ALL,
      ADMIN,
      201,
      MatchingRuleSetCreate.parse({ name: 'Off', isActive: false, reason: 'Draft' }),
    )

    expect([empty.sheetRules, empty.columnRules]).toEqual([[], []])
    expect(off.isActive).toBe(false)
    expect(repo.audits[1].detail.reason).toBe('Draft')
    expect(repo.audits[0].detail).not.toHaveProperty('reason')
  })

  it('answers 409 rule_set_name_taken for a name of the provider in other case, creating nothing', async () => {
    await expect(
      service.create(ALL, ADMIN, 201, MatchingRuleSetCreate.parse({ name: 'PROVIDER C LEGACY' })),
    ).rejects.toThrow(RuleSetNameTakenError)
    expect(await reads.listForProvider(ALL, 201)).toHaveLength(2)
    expect(repo.audits).toEqual([])
  })

  it('accepts the name of a set of another provider', async () => {
    const detail = await service.create(ALL, ADMIN, 101, MatchingRuleSetCreate.parse({ name: 'Provider C legacy' }))

    expect(detail.provider.providerId).toBe(101)
  })

  it('answers 404 for an unknown provider and for one outside the scope, before validating', async () => {
    const invalid = MatchingRuleSetCreate.parse({ name: 'X', sheetRules: [{ ...transactions, cycle: null }] })

    await expect(service.create(ALL, ADMIN, 999, invalid)).rejects.toThrow(NotFoundError)
    await expect(service.create(MERCHANT_1, ADMIN, 201, invalid)).rejects.toThrow(NotFoundError)
  })

  it('answers 400 with the field of the broken rule, creating nothing', async () => {
    const body = MatchingRuleSetCreate.parse({
      name: 'Bad',
      sheetRules: [
        transactions,
        { sheetPattern: 'Other Fees', isRegex: false, kind: 'batch_fees', cycle: 'E', statusId: null },
      ],
    })

    await expect(service.create(ALL, ADMIN, 201, body)).rejects.toMatchObject({
      constructor: MatchingRuleError,
      details: { field: 'sheetRules[1].cycle' },
    })
    expect(await reads.listForProvider(ALL, 201)).toHaveLength(2)
  })

  it('validates the column rules too', async () => {
    const body = MatchingRuleSetCreate.parse({
      name: 'Bad',
      columnRules: [{ ...txnRef, columnPattern: '^amount(', isRegex: true }],
    })

    await expect(service.create(ALL, ADMIN, 201, body)).rejects.toMatchObject({
      details: { field: 'columnRules[0].columnPattern' },
    })
  })
})

describe('detail', () => {
  it('answers the legacy set with its provider, accounts and rules in priority and saving order', async () => {
    const detail = await reads.detail(ALL, LEGACY_RULE_SET_ID)

    expect(detail.provider).toEqual({ providerId: 201, name: 'Provider C' })
    expect(detail.accounts).toEqual([
      { accountId: ACCOUNT_IDS['ProviderC-Alt'], name: 'ProviderC-Alt', isActive: true },
    ])
    expect(detail.sheetRules.map((r) => [r.sheetPattern, r.statusId])).toEqual([
      ['TRX', null],
      ['CB', null],
      ['Fail', 3],
      ['Summary', null],
    ])
    expect(detail.columnRules.map((r) => [r.columnPattern, r.sheetPattern])).toEqual([
      ['Merchant Order No#', null],
      ['Order Status', null],
      ['Amount USD', null],
    ])
  })

  it('answers 404 for a set outside the scope and for an unknown one, with the same message', async () => {
    const outside = await reads.detail(MERCHANT_1, LEGACY_RULE_SET_ID).catch((e) => e)
    const unknown = await reads.detail(ALL, 999_999).catch((e) => e)

    expect(outside).toBeInstanceOf(NotFoundError)
    expect(unknown).toBeInstanceOf(NotFoundError)
    expect(outside.message).toBe(unknown.message)
  })
})

describe('put', () => {
  it('replaces a sheet rule: new rule ids, the new status, an update audit with before and after', async () => {
    const before = await legacy()
    const sheetRules = bodyOf(before).sheetRules.map((r) => (r.sheetPattern === 'TRX' ? { ...r, statusId: 2 } : r))

    const after = await service.put(ALL, ADMIN, LEGACY_RULE_SET_ID, bodyOf(before, { sheetRules }))

    expect(after.sheetRules.find((r) => r.sheetPattern === 'TRX')?.statusId).toBe(2)
    const oldIds = before.sheetRules.map((r) => r.sheetRuleId)
    expect(after.sheetRules.every((r) => !oldIds.includes(r.sheetRuleId))).toBe(true)
    expect(repo.audits).toHaveLength(1)
    expect(repo.audits[0]).toMatchObject({ action: 'matching_rule_set.update', ruleSetId: LEGACY_RULE_SET_ID })
    expect(Object.keys(repo.audits[0].detail.changes as object)).toEqual(['sheetRules'])
  })

  it('keeps the rule ids of a list that does not change', async () => {
    const before = await legacy()

    const after = await service.put(ALL, ADMIN, LEGACY_RULE_SET_ID, bodyOf(before, { name: 'Provider C old' }))

    expect(after.name).toBe('Provider C old')
    expect(after.sheetRules).toEqual(before.sheetRules)
    expect(after.columnRules).toEqual(before.columnRules)
    expect(repo.audits[0].detail).toEqual({
      changes: { name: { before: 'Provider C legacy', after: 'Provider C old' } },
    })
  })

  it('answers the same document without writing: same rule ids and no audit', async () => {
    const before = await legacy()

    const after = await service.put(ALL, ADMIN, LEGACY_RULE_SET_ID, bodyOf(before, { reason: 'Nothing' }))

    expect(after).toEqual(before)
    expect(repo.audits).toEqual([])
  })

  it('saves an inactive rule and shows it', async () => {
    const before = await legacy()
    const sheetRules = bodyOf(before).sheetRules.map((r) => (r.sheetPattern === 'Fail' ? { ...r, isActive: false } : r))

    const after = await service.put(ALL, ADMIN, LEGACY_RULE_SET_ID, bodyOf(before, { sheetRules }))

    expect(after.sheetRules.find((r) => r.sheetPattern === 'Fail')?.isActive).toBe(false)
  })

  it('keeps the body order of equal priorities: it is the tie-break of the proposal', async () => {
    const before = await legacy()
    const reversed = [...bodyOf(before).sheetRules].reverse()

    const after = await service.put(ALL, ADMIN, LEGACY_RULE_SET_ID, bodyOf(before, { sheetRules: reversed }))

    expect(after.sheetRules.map((r) => r.sheetPattern)).toEqual(['Summary', 'Fail', 'CB', 'TRX'])
  })

  it('audits the column rules with before and after without ids, and the reason', async () => {
    const before = await legacy()
    const columnRules = bodyOf(before).columnRules.slice(0, 2)

    await service.put(ALL, ADMIN, LEGACY_RULE_SET_ID, bodyOf(before, { columnRules, reason: 'New column layout' }))

    const detail = repo.audits[0].detail as { changes: Record<string, unknown>; reason: string }
    expect(detail.reason).toBe('New column layout')
    expect(Object.keys(detail.changes)).toEqual(['columnRules'])
    expect(JSON.stringify(detail)).not.toContain('columnRuleId')
  })

  it('answers 409 rule_set_in_use with the linked accounts when deactivating the legacy set, writing nothing', async () => {
    const before = await legacy()

    const error = await service
      .put(ALL, ADMIN, LEGACY_RULE_SET_ID, bodyOf(before, { isActive: false, name: 'Gone' }))
      .catch((e) => e)

    expect(error).toBeInstanceOf(RuleSetInUseError)
    expect(error.details).toEqual({ accounts: [{ accountId: ACCOUNT_IDS['ProviderC-Alt'], name: 'ProviderC-Alt' }] })
    expect(await legacy()).toEqual(before)
    expect(repo.audits).toEqual([])
  })

  it('counts a closed linked account as in use', async () => {
    repo.link(
      { accountId: 'c0000000-0000-4000-8000-000000000001', name: 'it-closed', isActive: false },
      ARCHIVE_RULE_SET_ID,
    )
    const archive = await reads.detail(ALL, ARCHIVE_RULE_SET_ID)
    await service.put(ALL, ADMIN, ARCHIVE_RULE_SET_ID, bodyOf(archive, { isActive: true }))
    const active = await reads.detail(ALL, ARCHIVE_RULE_SET_ID)

    await expect(
      service.put(ALL, ADMIN, ARCHIVE_RULE_SET_ID, bodyOf(active, { isActive: false })),
    ).rejects.toMatchObject({
      details: { accounts: [{ name: 'it-closed' }] },
    })
  })

  it('edits an inactive set without the in-use check, and reactivates it', async () => {
    repo.link(
      { accountId: 'c0000000-0000-4000-8000-000000000002', name: 'it-linked', isActive: true },
      ARCHIVE_RULE_SET_ID,
    )
    const archive = await reads.detail(ALL, ARCHIVE_RULE_SET_ID)

    const renamed = await service.put(ALL, ADMIN, ARCHIVE_RULE_SET_ID, bodyOf(archive, { name: 'Provider C old' }))
    const active = await service.put(ALL, ADMIN, ARCHIVE_RULE_SET_ID, bodyOf(renamed, { isActive: true }))

    expect(active.isActive).toBe(true)
    expect(repo.audits.map((a) => a.action)).toEqual(['matching_rule_set.update', 'matching_rule_set.activate'])
  })

  it('deactivates and reactivates a free set, auditing deactivate and activate', async () => {
    const created = await service.create(ALL, ADMIN, 201, MatchingRuleSetCreate.parse({ name: 'Free' }))

    const off = await service.put(ALL, ADMIN, created.ruleSetId, bodyOf(created, { isActive: false }))
    const on = await service.put(ALL, ADMIN, created.ruleSetId, bodyOf(off, { isActive: true }))

    expect([off.isActive, on.isActive]).toEqual([false, true])
    expect(repo.audits.map((a) => a.action)).toEqual([
      'matching_rule_set.create',
      'matching_rule_set.deactivate',
      'matching_rule_set.activate',
    ])
  })

  it('audits a deactivation with a rename as deactivate only, with both changes', async () => {
    const created = await service.create(ALL, ADMIN, 201, MatchingRuleSetCreate.parse({ name: 'Free' }))

    await service.put(ALL, ADMIN, created.ruleSetId, bodyOf(created, { isActive: false, name: 'Free old' }))

    expect(repo.audits[1]).toMatchObject({
      action: 'matching_rule_set.deactivate',
      detail: { changes: { isActive: { before: true, after: false }, name: { before: 'Free', after: 'Free old' } } },
    })
  })

  it('answers 409 rule_set_name_taken when renaming to another set of the provider, keeping the set', async () => {
    const archive = await reads.detail(ALL, ARCHIVE_RULE_SET_ID)

    await expect(
      service.put(ALL, ADMIN, ARCHIVE_RULE_SET_ID, bodyOf(archive, { name: 'provider c legacy', sheetRules: [] })),
    ).rejects.toThrow(RuleSetNameTakenError)
    expect(await reads.detail(ALL, ARCHIVE_RULE_SET_ID)).toEqual(archive)
  })

  it('accepts a rename that only changes case', async () => {
    const before = await legacy()

    const after = await service.put(ALL, ADMIN, LEGACY_RULE_SET_ID, bodyOf(before, { name: 'PROVIDER C LEGACY' }))

    expect(after.name).toBe('PROVIDER C LEGACY')
  })

  it('validates before comparing: an invalid body is 400 and writes nothing', async () => {
    const before = await legacy()
    const sheetRules = bodyOf(before).sheetRules.map((r) => (r.sheetPattern === 'TRX' ? { ...r, statusId: 4 } : r))

    await expect(service.put(ALL, ADMIN, LEGACY_RULE_SET_ID, bodyOf(before, { sheetRules }))).rejects.toMatchObject({
      details: { field: 'sheetRules[0].statusId' },
    })
    expect(await legacy()).toEqual(before)
  })

  it('answers 404 for an unknown set and for one outside the scope', async () => {
    const before = await legacy()

    await expect(service.put(ALL, ADMIN, 999_999, bodyOf(before))).rejects.toThrow(NotFoundError)
    await expect(service.put(MERCHANT_1, ADMIN, LEGACY_RULE_SET_ID, bodyOf(before))).rejects.toThrow(NotFoundError)
    expect(repo.locked).toEqual([])
  })
})
