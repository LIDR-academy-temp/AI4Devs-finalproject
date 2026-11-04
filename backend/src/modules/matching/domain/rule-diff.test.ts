import type { ColumnRuleInput, SheetRuleInput, StatusAliasInput } from '@recon/shared'
import { describe, expect, it } from 'vitest'
import { actionFor, diffGlobals, diffRuleSet, type GlobalRulesDocument, type RuleSetDocument } from './rule-diff.js'

// admin-matching design D2; spec matching "Editar un conjunto de reglas", "Auditoría de las reglas de pareo" and
// "Reglas globales editables".

const trx: SheetRuleInput = {
  sheetPattern: 'TRX',
  isRegex: false,
  kind: 'transactions',
  cycle: 'E',
  statusId: null,
  priority: 10,
  isActive: true,
}
const cb: SheetRuleInput = { ...trx, sheetPattern: 'CB', cycle: 'I' }
const id: ColumnRuleInput = {
  sheetPattern: null,
  columnPattern: 'Merchant Order No#',
  isRegex: false,
  targetField: 'transactionId',
  priority: 5,
  isActive: true,
}
const amount: ColumnRuleInput = { ...id, columnPattern: 'Amount USD', targetField: 'amount' }
const successful: StatusAliasInput = { alias: 'Successful', statusId: 2, excludeAmount: false, isLegacy: false }

const legacy: RuleSetDocument = {
  name: 'Provider C legacy',
  isActive: true,
  sheetRules: [trx, cb],
  columnRules: [id, amount],
}

describe('diffRuleSet', () => {
  it('has no changes for the same document, even rebuilt with other object identities', () => {
    const again = structuredClone(legacy)

    expect(diffRuleSet(legacy, again)).toEqual({})
  })

  it('ignores the key order of a rule', () => {
    const { sheetPattern, ...rest } = trx
    const reordered = { ...legacy, sheetRules: [{ ...rest, sheetPattern }, cb] }

    expect(diffRuleSet(legacy, reordered)).toEqual({})
  })

  it('records a rename that only changes case', () => {
    expect(diffRuleSet(legacy, { ...legacy, name: 'PROVIDER C LEGACY' })).toEqual({
      name: { before: 'Provider C legacy', after: 'PROVIDER C LEGACY' },
    })
  })

  it('records a reordering of the rules: the order is the tie-break of the proposal', () => {
    expect(diffRuleSet(legacy, { ...legacy, sheetRules: [cb, trx] })).toEqual({
      sheetRules: { before: [trx, cb], after: [cb, trx] },
    })
  })

  it('compares in priority order: a list given in another order of distinct priorities is no change', () => {
    const late = { ...cb, priority: 20 }
    const stored = { ...legacy, sheetRules: [late, trx] }

    expect(diffRuleSet(stored, { ...legacy, sheetRules: [trx, late] })).toEqual({})
  })

  it('records only the list that changes, as whole lists without rule ids', () => {
    const fail = { ...trx, statusId: 3 }
    const changes = diffRuleSet(legacy, { ...legacy, sheetRules: [fail, cb] })

    expect(Object.keys(changes)).toEqual(['sheetRules'])
    expect(changes.sheetRules).toEqual({ before: [trx, cb], after: [fail, cb] })
  })

  it('keeps no rule id in before or after, even when the stored rules carried one', () => {
    const stored = {
      ...legacy,
      columnRules: [
        { ...id, columnRuleId: 41 },
        { ...amount, columnRuleId: 43 },
      ],
    }
    const changes = diffRuleSet(stored, { ...legacy, columnRules: [amount] })

    expect(changes.columnRules).toEqual({ before: [id, amount], after: [amount] })
    expect(JSON.stringify(changes)).not.toContain('columnRuleId')
  })

  it('records isActive together with the other changes', () => {
    expect(diffRuleSet(legacy, { ...legacy, name: 'Old', isActive: false })).toEqual({
      name: { before: 'Provider C legacy', after: 'Old' },
      isActive: { before: true, after: false },
    })
  })
})

describe('actionFor', () => {
  it('is deactivate when isActive goes to false, whatever else changes', () => {
    expect(actionFor(diffRuleSet(legacy, { ...legacy, name: 'Old', isActive: false }))).toBe('deactivate')
  })

  it('is activate when isActive goes to true', () => {
    const inactive = { ...legacy, isActive: false }

    expect(actionFor(diffRuleSet(inactive, { ...inactive, isActive: true, sheetRules: [] }))).toBe('activate')
  })

  it('is update for any other change', () => {
    expect(actionFor(diffRuleSet(legacy, { ...legacy, columnRules: [] }))).toBe('update')
    expect(actionFor(diffRuleSet(legacy, { ...legacy, name: 'Renamed' }))).toBe('update')
  })
})

describe('diffGlobals', () => {
  const globals: GlobalRulesDocument = {
    sheetRules: [trx],
    columnRules: [id],
    statusAliases: [{ alias: 'CHB 2', statusId: 4, excludeAmount: true, isLegacy: true }, successful],
  }

  it('has no changes for the same document', () => {
    expect(diffGlobals(globals, structuredClone(globals))).toEqual({})
  })

  it('records only the lists that change', () => {
    const approved = { alias: 'Approved OK', statusId: 2, excludeAmount: false, isLegacy: false }
    const changes = diffGlobals(globals, { ...globals, statusAliases: [...globals.statusAliases, approved] })

    expect(changes).toEqual({
      statusAliases: { before: globals.statusAliases, after: [approved, ...globals.statusAliases] },
    })
  })

  it('compares the aliases by text: their order means nothing (the alias is the key)', () => {
    expect(diffGlobals(globals, { ...globals, statusAliases: [...globals.statusAliases].reverse() })).toEqual({})
  })

  it('compares each list on its own', () => {
    const changes = diffGlobals(globals, { ...globals, sheetRules: [cb], columnRules: [amount] })

    expect(Object.keys(changes)).toEqual(['sheetRules', 'columnRules'])
  })
})
