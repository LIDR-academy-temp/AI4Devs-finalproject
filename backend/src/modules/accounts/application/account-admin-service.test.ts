import type { AccountCreate } from '@recon/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { NotFoundError } from '../../../shared/errors.js'
import { ACCOUNT_IDS, InMemoryCatalogRepository } from '../../catalog/application/__fakes__/in-memory.js'
import { CatalogService } from '../../catalog/application/catalog-service.js'
import type { Scope } from '../../catalog/domain/scope.js'
import { AccountNameTakenError, AccountRuleError } from '../domain/errors.js'
import {
  INACTIVE_RULE_SET,
  InMemoryAccountAdminRepository,
  LEGACY_RULE_SET,
  PROVIDER_A_RULE_SET,
} from './__fakes__/in-memory.js'
import { AccountAdminService } from './account-admin-service.js'

// Spec accounts (crear, nombre único, conjunto de reglas, editar, cerrar y reabrir, auditoría, canales de solo
// lectura) and spec fees "Copia de fees al crear cuenta", over in-memory doubles (admin-accounts design D4).

const ALL: Scope = { merchantIds: [1, 2] }
const VIEWER: Scope = { merchantIds: [1] }
const ADMIN = 1
const TODAY = '2026-11-03'
const UNKNOWN_UUID = '00000000-0000-4000-8000-00000000ffff'

let catalog: InMemoryCatalogRepository
let repo: InMemoryAccountAdminRepository
let service: AccountAdminService
let ids: number

beforeEach(() => {
  catalog = new InMemoryCatalogRepository()
  repo = new InMemoryAccountAdminRepository(catalog)
  ids = 0
  service = new AccountAdminService(
    repo,
    new CatalogService(catalog),
    () => TODAY,
    () => `e0000000-0000-4000-8000-${String(++ids).padStart(12, '0')}`,
  )
})

const minimal: AccountCreate = { name: 'bruno-min', chargebackReservePolicy: 'hold_until_term' }

async function failure(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error('expected the write to fail')
    },
    (e: unknown) => e,
  )
}

/** Nothing was written: the accounts, fees, history and audit are as the doubles started. */
function expectNothingWritten() {
  expect(catalog.fixture.accounts).toHaveLength(5)
  expect([...repo.fees.keys()]).toEqual([ACCOUNT_IDS['ProviderC-USD']])
  expect(repo.history).toEqual([])
  expect(repo.audits).toEqual([])
}

describe('create', () => {
  it('creates an active account without fees, created by the caller ("Cuenta mínima")', async () => {
    const account = await service.create(ALL, ADMIN, 201, minimal)

    expect(account).toMatchObject({
      name: 'bruno-min',
      providerId: 201,
      isActive: true,
      chargebackReservePolicy: 'hold_until_term',
      rollingReserveCapAmt: null,
      matchingRuleSetId: null,
      createdBy: { userId: 1, userName: 'admin' },
      merchant: { merchantId: 2 },
    })
    expect(repo.feesOf(account.accountId)).toEqual([])
    expect(await catalog.listAccountChannels(ALL, account.accountId)).toEqual([])
  })

  it('audits the creation with its initial values and no copy ("Alta auditada")', async () => {
    const account = await service.create(ALL, ADMIN, 201, { ...minimal, rollingReserveCapAmt: '25000' })

    expect(repo.audits).toEqual([
      {
        action: 'account.create',
        accountId: account.accountId,
        userId: ADMIN,
        detail: {
          name: 'bruno-min',
          providerId: 201,
          chargebackReservePolicy: 'hold_until_term',
          rollingReserveCapAmt: '25000.0000',
          matchingRuleSetId: null,
          copyFeesFromAccountId: null,
          copiedFees: [],
        },
      },
    ])
  })

  it('normalizes the cap to four decimals ("Tope de reserva normalizado")', async () => {
    const account = await service.create(ALL, ADMIN, 201, { ...minimal, rollingReserveCapAmt: '25000' })

    expect(account.rollingReserveCapAmt).toBe('25000.0000')
  })

  it('rejects a negative cap with 400 on rollingReserveCapAmt and writes nothing ("Tope negativo")', async () => {
    const error = await failure(service.create(ALL, ADMIN, 201, { ...minimal, rollingReserveCapAmt: '-1' }))

    expect(error).toBeInstanceOf(AccountRuleError)
    expect(error).toMatchObject({ details: { field: 'rollingReserveCapAmt' } })
    expectNothingWritten()
  })

  it.each([
    { title: 'a provider that does not exist', scope: ALL, providerId: 999 },
    { title: 'a provider outside the scope', scope: VIEWER, providerId: 201 },
  ])('answers not found for $title', async ({ scope, providerId }) => {
    expect(await failure(service.create(scope, ADMIN, providerId, minimal))).toBeInstanceOf(NotFoundError)
    expectNothingWritten()
  })
})

describe('name unique across the system', () => {
  it.each([
    { title: 'another account of the same provider, ignoring case', name: 'providerc-usd' },
    { title: 'an account of another provider', name: 'ProviderA-USD' },
  ])('rejects the name of $title with 409 account_name_taken', async ({ name }) => {
    const error = await failure(service.create(ALL, ADMIN, 201, { ...minimal, name }))

    expect(error).toBeInstanceOf(AccountNameTakenError)
    expect(error).toMatchObject({ status: 409, code: 'account_name_taken' })
    expectNothingWritten()
  })

  it('rejects a rename to a name in use and keeps the account as it was ("Renombrar a un nombre en uso")', async () => {
    const account = await service.create(ALL, ADMIN, 201, minimal)
    repo.audits = []

    const error = await failure(service.patch(ALL, ADMIN, account.accountId, { name: 'ProviderC-Alt' }))

    expect(error).toBeInstanceOf(AccountNameTakenError)
    expect((await catalog.findAccount(ALL, account.accountId))?.name).toBe('bruno-min')
    expect(repo.audits).toEqual([])
  })

  it('lets an account change the case of its own name', async () => {
    const account = await service.create(ALL, ADMIN, 201, minimal)

    expect((await service.patch(ALL, ADMIN, account.accountId, { name: 'Bruno-Min' })).name).toBe('Bruno-Min')
  })
})

describe('rule set of an account', () => {
  it('links the account to an active rule set of its provider', async () => {
    const account = await service.create(ALL, ADMIN, 201, { ...minimal, matchingRuleSetId: LEGACY_RULE_SET.ruleSetId })

    expect(account.matchingRuleSetId).toBe(LEGACY_RULE_SET.ruleSetId)
  })

  it.each([
    { title: 'of another provider', ruleSetId: PROVIDER_A_RULE_SET.ruleSetId },
    { title: 'that does not exist', ruleSetId: 999999 },
    { title: 'that is inactive', ruleSetId: INACTIVE_RULE_SET.ruleSetId },
  ])('rejects a rule set $title with 400 on matchingRuleSetId', async ({ ruleSetId }) => {
    const error = await failure(service.create(ALL, ADMIN, 201, { ...minimal, matchingRuleSetId: ruleSetId }))

    expect(error).toBeInstanceOf(AccountRuleError)
    expect(error).toMatchObject({ details: { field: 'matchingRuleSetId' } })
    expectNothingWritten()
  })

  it('rejects an unknown rule set on edit and leaves the account unchanged', async () => {
    const accountId = ACCOUNT_IDS['ProviderC-USD']

    const error = await failure(service.patch(ALL, ADMIN, accountId, { matchingRuleSetId: 999999 }))

    expect(error).toMatchObject({ details: { field: 'matchingRuleSetId' } })
    expect((await catalog.findAccount(ALL, accountId))?.matchingRuleSetId).toBeNull()
  })

  it('unlinks with null ("Desenlazar")', async () => {
    const account = await service.create(ALL, ADMIN, 201, { ...minimal, matchingRuleSetId: LEGACY_RULE_SET.ruleSetId })

    const edited = await service.patch(ALL, ADMIN, account.accountId, { matchingRuleSetId: null })

    expect(edited.matchingRuleSetId).toBeNull()
  })

  it('keeps a stored rule set that became inactive when the edit does not touch it', async () => {
    const account = await service.create(ALL, ADMIN, 201, { ...minimal, matchingRuleSetId: LEGACY_RULE_SET.ruleSetId })
    repo.ruleSets.find((r) => r.ruleSetId === LEGACY_RULE_SET.ruleSetId)!.isActive = false

    const edited = await service.patch(ALL, ADMIN, account.accountId, { name: 'bruno-renamed' })

    expect(edited).toMatchObject({ name: 'bruno-renamed', matchingRuleSetId: LEGACY_RULE_SET.ruleSetId })
  })
})

describe('copy of fees when creating an account', () => {
  const fromCUsd = { ...minimal, copyFeesFromAccountId: ACCOUNT_IDS['ProviderC-USD'] }

  it('copies the five fees of ProviderC-USD with open validity, leaving the source unchanged', async () => {
    const source = repo.feesOf(ACCOUNT_IDS['ProviderC-USD'])

    const account = await service.create(ALL, ADMIN, 201, fromCUsd)
    const copies = repo.feesOf(account.accountId)

    expect(copies.map((f) => f.feeTypeId)).toEqual([1, 2, 3, 4, 5])
    for (const [i, copy] of copies.entries()) {
      const { feeId: _s, ...values } = source[i]!
      const { feeId, ...copied } = copy
      expect(copied).toEqual({ ...values, startDate: null, endDate: null })
      expect(feeId).not.toBe(source[i]!.feeId)
    }
    expect(repo.feesOf(ACCOUNT_IDS['ProviderC-USD'])).toEqual(source)
  })

  it('locks the source account before reading its fees', async () => {
    await service.create(ALL, ADMIN, 201, fromCUsd)

    expect(repo.locked).toEqual([ACCOUNT_IDS['ProviderC-USD']])
  })

  it('writes one copied history row per copy and the pairs in account.create ("Historial de la copia")', async () => {
    const account = await service.create(ALL, ADMIN, 201, fromCUsd)
    const copies = repo.feesOf(account.accountId)
    const source = repo.feesOf(ACCOUNT_IDS['ProviderC-USD'])

    expect(repo.history).toEqual(
      copies.map((copy) => ({ feeId: copy.feeId, action: 'copied', before: null, after: copy, userId: ADMIN })),
    )
    expect(repo.audits).toHaveLength(1)
    expect(repo.audits[0]).toMatchObject({
      action: 'account.create',
      detail: {
        copyFeesFromAccountId: ACCOUNT_IDS['ProviderC-USD'],
        copiedFees: source.map((s, i) => ({ sourceFeeId: s.feeId, feeId: copies[i]!.feeId })),
      },
    })
  })

  it('leaves out a fee scheduled from tomorrow and one closed yesterday ("Un fee programado no se copia")', async () => {
    const sourceId = ACCOUNT_IDS['ProviderC-USD']
    const fees = repo.fees.get(sourceId)!
    fees[3]!.endDate = '2026-11-02'
    fees.push({ ...fees[3]!, feeId: 'f0000000-0000-4000-8000-000000000006', startDate: '2026-11-04', endDate: null })

    const account = await service.create(ALL, ADMIN, 201, fromCUsd)

    expect(repo.feesOf(account.accountId).map((f) => f.feeTypeId)).toEqual([1, 2, 3, 5])
  })

  it('copies from a closed account of the provider ("Cuenta origen cerrada")', async () => {
    catalog.fixture.accounts.find((a) => a.accountId === ACCOUNT_IDS['ProviderC-USD'])!.isActive = false

    const account = await service.create(ALL, ADMIN, 201, fromCUsd)

    expect(repo.feesOf(account.accountId)).toHaveLength(5)
  })

  it.each([
    { title: 'of another provider', source: ACCOUNT_IDS['ProviderA-USD'] },
    { title: 'that does not exist', source: UNKNOWN_UUID },
  ])('rejects a source $title with 400 on copyFeesFromAccountId and creates nothing', async ({ source }) => {
    const error = await failure(service.create(ALL, ADMIN, 201, { ...minimal, copyFeesFromAccountId: source }))

    expect(error).toBeInstanceOf(AccountRuleError)
    expect(error).toMatchObject({ details: { field: 'copyFeesFromAccountId' } })
    expectNothingWritten()
  })

  it('creates the account without fees when the source has none active', async () => {
    const account = await service.create(ALL, ADMIN, 201, {
      ...minimal,
      copyFeesFromAccountId: ACCOUNT_IDS['ProviderC-Alt'],
    })

    expect(repo.feesOf(account.accountId)).toEqual([])
    expect(repo.audits[0]?.detail).toMatchObject({ copiedFees: [] })
  })
})

describe('patch', () => {
  let accountId: string

  beforeEach(async () => {
    accountId = (await service.create(ALL, ADMIN, 201, minimal)).accountId
    repo.audits = []
  })

  it('changes the policy and the cap and moves updatedAt ("Cambiar política y tope")', async () => {
    const before = await catalog.findAccount(ALL, accountId)

    const edited = await service.patch(ALL, ADMIN, accountId, {
      chargebackReservePolicy: 'release_on_chargeback',
      rollingReserveCapAmt: '1000',
    })

    expect(edited).toMatchObject({
      chargebackReservePolicy: 'release_on_chargeback',
      rollingReserveCapAmt: '1000.0000',
    })
    expect(edited.updatedAt > before!.updatedAt).toBe(true)
    expect(repo.audits).toEqual([
      {
        action: 'account.update',
        accountId,
        userId: ADMIN,
        detail: {
          changes: {
            chargebackReservePolicy: { before: 'hold_until_term', after: 'release_on_chargeback' },
            rollingReserveCapAmt: { before: null, after: '1000.0000' },
          },
        },
      },
    ])
  })

  it('audits a rename with the previous name ("Renombrar")', async () => {
    await service.patch(ALL, ADMIN, accountId, { name: 'bruno-y' })

    expect(repo.audits[0]?.detail).toEqual({ changes: { name: { before: 'bruno-min', after: 'bruno-y' } } })
  })

  it('answers 200 without writing when the body changes nothing ("Cuerpo que no cambia nada")', async () => {
    const before = await catalog.findAccount(ALL, accountId)

    const same = await service.patch(ALL, ADMIN, accountId, {
      name: 'bruno-min',
      chargebackReservePolicy: 'hold_until_term',
      rollingReserveCapAmt: null,
      reason: 'nothing',
    })

    expect(same).toEqual(before)
    expect(repo.audits).toEqual([])
  })

  it('closes with a reason and other changes in one account.close entry ("Cierre auditado con cambios")', async () => {
    await service.patch(ALL, ADMIN, accountId, { rollingReserveCapAmt: '1000' })
    repo.audits = []

    const closed = await service.patch(ALL, ADMIN, accountId, {
      isActive: false,
      rollingReserveCapAmt: null,
      reason: 'closing',
    })

    expect(closed.isActive).toBe(false)
    expect(repo.audits).toEqual([
      {
        action: 'account.close',
        accountId,
        userId: ADMIN,
        detail: {
          changes: {
            rollingReserveCapAmt: { before: '1000.0000', after: null },
            isActive: { before: true, after: false },
          },
          reason: 'closing',
        },
      },
    ])
  })

  it('reopens a closed account as account.reopen ("Reabrir")', async () => {
    await service.patch(ALL, ADMIN, accountId, { isActive: false })

    const reopened = await service.patch(ALL, ADMIN, accountId, { isActive: true })

    expect(reopened.isActive).toBe(true)
    expect(repo.audits.map((a) => a.action)).toEqual(['account.close', 'account.reopen'])
  })

  it('keeps the account in the provider list after closing it, and its channels untouched ("Cerrar")', async () => {
    const usd = ACCOUNT_IDS['ProviderC-USD']
    const channelsBefore = await catalog.listAccountChannels(ALL, usd)

    await service.patch(ALL, ADMIN, usd, { isActive: false, reason: 'provider stopped' })

    const listed = (await catalog.listProviderAccounts(ALL, 201)).find((a) => a.accountId === usd)
    expect(listed?.isActive).toBe(false)
    expect(await catalog.listAccountChannels(ALL, usd)).toEqual(channelsBefore)
    expect(channelsBefore[0]?.isPrimary).toBe(true)
  })

  it.each([
    { title: 'an unknown account', scope: ALL, id: UNKNOWN_UUID },
    { title: 'an account outside the scope', scope: VIEWER, id: ACCOUNT_IDS['ProviderC-USD'] },
  ])('answers not found for $title', async ({ scope, id }) => {
    expect(await failure(service.patch(scope, ADMIN, id, { isActive: false }))).toBeInstanceOf(NotFoundError)
    expect(repo.audits).toEqual([])
  })

  it('rejects a negative cap on edit with 400 and writes nothing', async () => {
    const error = await failure(service.patch(ALL, ADMIN, accountId, { rollingReserveCapAmt: '-5' }))

    expect(error).toMatchObject({ details: { field: 'rollingReserveCapAmt' } })
    expect(repo.audits).toEqual([])
  })
})

describe('channels stay read-only', () => {
  it('creating, editing, closing and reopening never touch AccountChannel ("Canales de solo lectura")', async () => {
    const before = structuredClone(catalog.fixture.accountChannels)

    const account = await service.create(ALL, ADMIN, 101, minimal)
    await service.patch(ALL, ADMIN, account.accountId, { name: 'bruno-x', isActive: false })
    await service.patch(ALL, ADMIN, account.accountId, { isActive: true })
    await service.patch(ALL, ADMIN, ACCOUNT_IDS['ProviderA-USD'], { isActive: false })

    expect(catalog.fixture.accountChannels).toEqual(before)
    expect((await catalog.listChannels(ALL, { unassigned: true })).map((c) => c.channelId)).toEqual([1007, 1013])
  })
})
