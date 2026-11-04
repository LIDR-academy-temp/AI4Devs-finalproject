// The account administration (README §1.2 "Creación de cuentas", §3.2 Account, §4.4; spec accounts; admin-accounts
// design D3, D4, D6): create an account, copying the active fees of another account of the provider, and edit, close
// or reopen it. Every write leaves its AuditLog entry in the same transaction; the answer is the catalog's detail.
import { randomUUID } from 'node:crypto'
import type { AccountCreate, AccountDetail, AccountPatch } from '@recon/shared'
import { NotFoundError } from '../../../shared/errors.js'
import type { CatalogService } from '../../catalog/application/catalog-service.js'
import type { Scope } from '../../catalog/domain/scope.js'
import { newYorkToday, type Today } from '../../fees/application/fee-read-service.js'
import { planCopy } from '../../fees/domain/fee-copy.js'
import { normalizeCap, planAccountPatch } from '../domain/account-rules.js'
import { AccountNameTakenError, AccountRuleError } from '../domain/errors.js'
import type { AccountAdminRepository, AccountAdminUnit } from './ports.js'

export class AccountAdminService {
  constructor(
    private readonly repository: AccountAdminRepository,
    private readonly catalog: CatalogService,
    private readonly today: Today = newYorkToday,
    private readonly newId: () => string = randomUUID,
  ) {}

  async create(scope: Scope, userId: number, providerId: number, body: AccountCreate): Promise<AccountDetail> {
    const today = this.today()
    const cap = normalizeCap(body.rollingReserveCapAmt ?? null)
    const matchingRuleSetId = body.matchingRuleSetId ?? null
    const source = body.copyFeesFromAccountId ?? null

    const accountId = await this.repository.inProvider(scope, providerId, async (unit) => {
      await assertRuleSet(unit, matchingRuleSetId, providerId)
      if (await unit.nameTaken(body.name)) throw new AccountNameTakenError()
      // The source is locked before its fees are read, so a fee change in flight lands wholly before or after (D4).
      if (source !== null && !(await unit.lockSourceAccount(source, providerId)))
        throw new AccountRuleError('copyFeesFromAccountId', 'The fee source must be another account of the provider')
      const copies = source === null ? [] : planCopy(await unit.sourceFees(source), today, this.newId)

      const id = this.newId()
      const state = {
        name: body.name,
        chargebackReservePolicy: body.chargebackReservePolicy,
        rollingReserveCapAmt: cap,
        matchingRuleSetId,
        isActive: true,
      }
      await unit.insertAccount({ accountId: id, providerId, createdByUserId: userId, ...state })
      for (const { copy } of copies) {
        await unit.insertFee(id, copy, userId)
        await unit.copiedHistory(copy, userId)
      }
      await unit.audit({
        action: 'account.create',
        accountId: id,
        userId,
        detail: {
          name: state.name,
          providerId,
          chargebackReservePolicy: state.chargebackReservePolicy,
          rollingReserveCapAmt: cap,
          matchingRuleSetId,
          // Ids in lowercase, as the entityId (D6): SQL Server returns them in capitals.
          copyFeesFromAccountId: source?.toLowerCase() ?? null,
          copiedFees: copies.map((c) => ({
            sourceFeeId: c.sourceFeeId.toLowerCase(),
            feeId: c.copy.feeId.toLowerCase(),
          })),
        },
      })
      return id
    })
    if (accountId === null) throw new NotFoundError('Provider')
    return this.catalog.getAccount(scope, accountId)
  }

  async patch(scope: Scope, userId: number, accountId: string, body: AccountPatch): Promise<AccountDetail> {
    const { reason, ...fields } = body
    const done = await this.repository.inAccount(scope, accountId, async (unit, current) => {
      const plan = planAccountPatch(current, fields)
      if (Object.keys(plan.changes).length === 0) return true

      const { name, matchingRuleSetId } = plan.changes
      if (matchingRuleSetId) await assertRuleSet(unit, matchingRuleSetId.after, current.providerId)
      if (name && (await unit.nameTaken(name.after, current.accountId))) throw new AccountNameTakenError()

      const { accountId: _, providerId: __, ...state } = current
      const next = { ...state, ...Object.fromEntries(Object.entries(plan.changes).map(([k, v]) => [k, v.after])) }
      await unit.updateAccount(current.accountId, next)
      await unit.audit({
        action: plan.action,
        accountId: current.accountId,
        userId,
        detail: reason === undefined ? { changes: plan.changes } : { changes: plan.changes, reason },
      })
      return true
    })
    if (done === null) throw new NotFoundError('Account')
    return this.catalog.getAccount(scope, accountId)
  }
}

/** A rule set to link must exist, belong to the provider and be active; null (global rules only) always passes. */
async function assertRuleSet(unit: AccountAdminUnit, ruleSetId: number | null, providerId: number): Promise<void> {
  if (ruleSetId === null) return
  const set = await unit.ruleSet(ruleSetId)
  if (set === null || set.providerId !== providerId || !set.isActive)
    throw new AccountRuleError('matchingRuleSetId', 'The rule set must be an active rule set of the provider')
}
