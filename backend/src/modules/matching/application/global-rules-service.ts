// The global matching rules (README §3.2 "Reglas de pareo", §4.4; spec matching "Reglas globales editables";
// admin-matching design D3, D4, D6): read them, and replace the sheet and column rules and the status aliases with
// the whole document. The row-ignore rules are read-only (#120). The merchant scope "all" is checked by the route.
import type { GlobalMatchingRules, GlobalMatchingRulesPut } from '@recon/shared'
import { columnRuleOf, diffGlobals, type GlobalRulesDocument, sheetRuleOf, statusAliasOf } from '../domain/rule-diff.js'
import { validateAliases, validateColumnRules, validateSheetRules } from '../domain/rule-validation.js'
import type { GlobalRulesRepository } from './ports.js'

export class GlobalRulesService {
  constructor(private readonly repository: GlobalRulesRepository) {}

  get(): Promise<GlobalMatchingRules> {
    return this.repository.globals()
  }

  /** The order of design D3 without the in-use and name steps: lock, validate, compare (no change: no write), replace, audit. */
  async put(userId: number, body: GlobalMatchingRulesPut): Promise<GlobalMatchingRules> {
    const document: GlobalRulesDocument = {
      sheetRules: body.sheetRules.map(sheetRuleOf),
      columnRules: body.columnRules.map(columnRuleOf),
      statusAliases: body.statusAliases.map(statusAliasOf),
    }
    return this.repository.inGlobals(async (unit, current) => {
      const statuses = await unit.statuses()
      validateSheetRules(document.sheetRules, statuses)
      validateColumnRules(document.columnRules)
      validateAliases(document.statusAliases, statuses)
      const changes = diffGlobals(current, document)
      if (Object.keys(changes).length === 0) return unit.globals()

      await unit.replaceGlobals({
        ...(changes.sheetRules ? { sheetRules: document.sheetRules } : {}),
        ...(changes.columnRules ? { columnRules: document.columnRules } : {}),
        ...(changes.statusAliases ? { statusAliases: document.statusAliases } : {}),
      })
      await unit.audit({ userId, detail: body.reason === undefined ? { changes } : { changes, reason: body.reason } })
      return unit.globals()
    })
  }
}
