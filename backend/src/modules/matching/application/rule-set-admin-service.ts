// The rule set administration (README §3.2 "Reglas de pareo", §4.4; spec matching; admin-matching design D2, D3,
// D6): create a set of a provider and replace its whole document. Every write validates first, leaves its AuditLog
// entry in the same transaction and answers the detail read inside it.
import type { MatchingRuleSetCreate, MatchingRuleSetDetail, MatchingRuleSetPut } from '@recon/shared'
import { NotFoundError } from '../../../shared/errors.js'
import type { Scope } from '../../catalog/domain/scope.js'
import { RuleSetInUseError, RuleSetNameTakenError } from '../domain/errors.js'
import { actionFor, columnRuleOf, diffRuleSet, type RuleSetDocument, sheetRuleOf } from '../domain/rule-diff.js'
import { validateColumnRules, validateSheetRules } from '../domain/rule-validation.js'
import type { MatchingRulesAdminRepository, RuleSetAdminUnit } from './ports.js'

function documentOf(body: Omit<MatchingRuleSetPut, 'reason'>): RuleSetDocument {
  return {
    name: body.name,
    isActive: body.isActive,
    sheetRules: body.sheetRules.map(sheetRuleOf),
    columnRules: body.columnRules.map(columnRuleOf),
  }
}

async function validate(unit: RuleSetAdminUnit, document: RuleSetDocument): Promise<void> {
  validateSheetRules(document.sheetRules, await unit.statuses())
  validateColumnRules(document.columnRules)
}

const withReason = (detail: Record<string, unknown>, reason: string | undefined) =>
  reason === undefined ? detail : { ...detail, reason }

export class RuleSetAdminService {
  constructor(private readonly repository: MatchingRulesAdminRepository) {}

  async create(
    scope: Scope,
    userId: number,
    providerId: number,
    body: MatchingRuleSetCreate,
  ): Promise<MatchingRuleSetDetail> {
    const document = documentOf({ ...body, isActive: body.isActive ?? true })
    const detail = await this.repository.inProvider(scope, providerId, async (unit) => {
      await validate(unit, document)
      if (await unit.nameTaken(providerId, document.name)) throw new RuleSetNameTakenError()
      const ruleSetId = await unit.insertRuleSet(providerId, document)
      await unit.audit({
        action: 'matching_rule_set.create',
        ruleSetId,
        userId,
        detail: withReason({ providerId, ...document }, body.reason),
      })
      return unit.detail(ruleSetId)
    })
    if (detail === null) throw new NotFoundError('Provider')
    return detail
  }

  /** The order of design D3: lock, validate, compare (no change: no write), in use, name, replace, audit. */
  async put(scope: Scope, userId: number, ruleSetId: number, body: MatchingRuleSetPut): Promise<MatchingRuleSetDetail> {
    const document = documentOf(body)
    const detail = await this.repository.inRuleSet(scope, ruleSetId, async (unit, current) => {
      await validate(unit, document)
      const changes = diffRuleSet(current, document)
      if (Object.keys(changes).length === 0) return unit.detail(ruleSetId)

      if (changes.isActive?.after === false) {
        const accounts = await unit.linkedAccounts(ruleSetId)
        if (accounts.length > 0) throw new RuleSetInUseError(accounts)
      }
      if (changes.name && (await unit.nameTaken(current.providerId, document.name, ruleSetId)))
        throw new RuleSetNameTakenError()

      await unit.updateRuleSet(ruleSetId, {
        ...(changes.name ? { name: document.name } : {}),
        ...(changes.isActive ? { isActive: document.isActive } : {}),
        ...(changes.sheetRules ? { sheetRules: document.sheetRules } : {}),
        ...(changes.columnRules ? { columnRules: document.columnRules } : {}),
      })
      await unit.audit({
        action: `matching_rule_set.${actionFor(changes)}`,
        ruleSetId,
        userId,
        detail: withReason({ changes }, body.reason),
      })
      return unit.detail(ruleSetId)
    })
    if (detail === null) throw new NotFoundError('Rule set')
    return detail
  }
}
