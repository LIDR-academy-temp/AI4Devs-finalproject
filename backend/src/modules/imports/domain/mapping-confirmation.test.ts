import type { MappingConfirmation, SheetMappingInput } from '@recon/shared'
import { describe, expect, it } from 'vitest'
import { proposeMapping } from '../../matching/domain/propose-mapping.js'
import { BATCH_CLEAN_WORKBOOK, RULES_FOR_PROVIDER_A } from '../application/__fakes__/in-memory.js'
import { MappingShapeError } from './errors.js'
import {
  assertKnownStatuses,
  confirmationFromProposal,
  effectiveMapping,
  type SheetFacts,
  validateMappingConfirmation,
} from './mapping-confirmation.js'

// Spec "Confirmación del pareo", "Forma del pareo confirmado", "Campo gateway no admitido todavía" and the matching
// spec "Pareo confirmado es la fuente de verdad" (design D6).
const proposal = proposeMapping(BATCH_CLEAN_WORKBOOK, RULES_FOR_PROVIDER_A)
const sheetId = (index: number) => `00000000-0000-4000-8000-0000000000${String(index + 1).padStart(2, '0')}`
const facts: SheetFacts[] = BATCH_CLEAN_WORKBOOK.sheets.map((sheet, index) => ({
  sheetId: sheetId(index),
  sheetName: sheet.name,
  headers: sheet.headers,
}))
const APP = facts[0] as SheetFacts
const body: MappingConfirmation = confirmationFromProposal(facts, proposal)

function withSheet(overrides: Partial<SheetMappingInput>, index = 0): MappingConfirmation {
  return { sheets: body.sheets.map((s, i) => (i === index ? { ...s, ...overrides } : s)) }
}

describe('confirmationFromProposal', () => {
  it('turns the template proposal into a confirmation body (sheets without proposal stay unclassified)', () => {
    expect(body.sheets).toHaveLength(10)
    expect(body.sheets[0]).toEqual({
      sheetId: APP.sheetId,
      kind: 'transactions',
      cycle: 'E',
      statusId: 2,
      columns: [
        { sourceColumn: 'ID', targetField: 'transactionId' },
        { sourceColumn: 'Amount', targetField: 'amount' },
        { sourceColumn: 'Currency', targetField: 'currency' },
      ],
    })
    expect(body.sheets[8]).toMatchObject({ kind: 'batch_fees', cycle: null, statusId: null })
    expect(body.sheets[9]).toMatchObject({ kind: 'ignore', columns: [] })
  })
})

describe('validateMappingConfirmation', () => {
  it('accepts the confirmation of the template proposal and returns it per sheet with the facts', () => {
    const validated = validateMappingConfirmation(body, facts)

    expect(validated).toHaveLength(10)
    expect(validated[0]).toMatchObject({
      sheetId: APP.sheetId,
      sheetName: 'APP',
      kind: 'transactions',
      cycle: 'E',
      statusId: 2,
    })
  })

  it('accepts an incomplete mapping (APP without transactionId): that is readiness, not a 400', () => {
    const incomplete = withSheet({ columns: [{ sourceColumn: 'Amount', targetField: 'amount' }] })

    expect(() => validateMappingConfirmation(incomplete, facts)).not.toThrow()
  })

  it('rejects a sheet left out or an unknown sheetId', () => {
    const missing = { sheets: body.sheets.slice(1) }
    expect(() => validateMappingConfirmation(missing, facts)).toThrow(MappingShapeError)
    expect(() => validateMappingConfirmation(missing, facts)).toThrow(/APP/)

    const unknown = withSheet({ sheetId: '00000000-0000-4000-8000-0000000000ff' })
    try {
      validateMappingConfirmation(unknown, facts)
      expect.fail('should throw')
    } catch (error) {
      expect(error).toBeInstanceOf(MappingShapeError)
      expect((error as MappingShapeError).details).toMatchObject({ sheetId: '00000000-0000-4000-8000-0000000000ff' })
    }
  })

  it('rejects a column that is not in the sheet header and a repeated target field', () => {
    const noSuchColumn = withSheet({ columns: [{ sourceColumn: 'Reference', targetField: 'transactionId' }] })
    try {
      validateMappingConfirmation(noSuchColumn, facts)
      expect.fail('should throw')
    } catch (error) {
      expect((error as MappingShapeError).details).toMatchObject({
        sheetId: APP.sheetId,
        sheetName: 'APP',
        sourceColumn: 'Reference',
      })
    }

    const repeated = withSheet({
      columns: [
        { sourceColumn: 'ID', targetField: 'amount' },
        { sourceColumn: 'Amount', targetField: 'amount' },
      ],
    })
    try {
      validateMappingConfirmation(repeated, facts)
      expect.fail('should throw')
    } catch (error) {
      expect((error as MappingShapeError).details).toMatchObject({ sheetName: 'APP', targetField: 'amount' })
    }
  })

  it('rejects cycle and status combinations that make no sense', () => {
    const noCycle = withSheet({ cycle: null })
    expect(() => validateMappingConfirmation(noCycle, facts)).toThrow(MappingShapeError)

    const rWithStatus = withSheet({ cycle: 'R', statusId: 2 }, 5)
    try {
      validateMappingConfirmation(rWithStatus, facts)
      expect.fail('should throw')
    } catch (error) {
      expect((error as MappingShapeError).details).toMatchObject({ sheetName: 'RR', field: 'statusId' })
    }

    const feesWithCycle = withSheet({ cycle: 'E' }, 8)
    expect(() => validateMappingConfirmation(feesWithCycle, facts)).toThrow(/cycle/)
    const ignoreWithStatus = withSheet({ statusId: 2 }, 9)
    expect(() => validateMappingConfirmation(ignoreWithStatus, facts)).toThrow(/statusId/)
  })

  it('rejects the gateway target field for now (decision 3 of the review)', () => {
    const gateway = withSheet({
      columns: [
        { sourceColumn: 'ID', targetField: 'transactionId' },
        { sourceColumn: 'Currency', targetField: 'gateway' },
      ],
    })
    try {
      validateMappingConfirmation(gateway, facts)
      expect.fail('should throw')
    } catch (error) {
      expect((error as MappingShapeError).details).toMatchObject({
        sheetName: 'APP',
        sourceColumn: 'Currency',
        targetField: 'gateway',
      })
      expect((error as MappingShapeError).message).toMatch(/not supported/)
    }
  })

  it('accepts reference columns (orderId, txnDate) that the analysis keeps in rawData only', () => {
    const reference = withSheet({
      columns: [
        { sourceColumn: 'ID', targetField: 'transactionId' },
        { sourceColumn: 'Amount', targetField: 'orderId' },
        { sourceColumn: 'Currency', targetField: 'txnDate' },
      ],
    })

    expect(() => validateMappingConfirmation(reference, facts)).not.toThrow()
  })
})

describe('effectiveMapping', () => {
  const proposed = proposal.sheets[0]

  it('is the confirmed mapping when the sheet is confirmed', () => {
    const confirmed = {
      kind: 'transactions' as const,
      cycle: 'E' as const,
      statusId: 3,
      columns: [{ sourceColumn: 'ID', targetField: 'transactionId' as const }],
    }

    expect(effectiveMapping({ mappingConfirmed: true, confirmed, proposed })).toEqual({
      ...confirmed,
      source: 'confirmed',
    })
  })

  it('falls back to the proposal (dropping unproposed columns) when the sheet is not confirmed', () => {
    expect(effectiveMapping({ mappingConfirmed: false, confirmed: null, proposed })).toEqual({
      kind: 'transactions',
      cycle: 'E',
      statusId: 2,
      columns: [
        { sourceColumn: 'ID', targetField: 'transactionId' },
        { sourceColumn: 'Amount', targetField: 'amount' },
        { sourceColumn: 'Currency', targetField: 'currency' },
      ],
      source: 'proposed',
    })
  })

  it('keeps kind null for a sheet without proposal', () => {
    const none = {
      sheetName: 'Bonus',
      proposed: { kind: null, cycle: null, statusId: null, statusName: null, source: 'none' as const },
      columns: [],
    }

    expect(effectiveMapping({ mappingConfirmed: false, confirmed: null, proposed: none })).toEqual({
      kind: null,
      cycle: null,
      statusId: null,
      columns: [],
      source: 'proposed',
    })
  })
})

describe('review of the PR: bodies the database would refuse (M2)', () => {
  const proposal = proposeMapping(BATCH_CLEAN_WORKBOOK, RULES_FOR_PROVIDER_A)
  const facts = BATCH_CLEAN_WORKBOOK.sheets.map((s, i) => ({
    sheetId: `sheet-${i}`,
    sheetName: s.name,
    headers: s.headers,
  }))

  it('rejects a source column mapped twice, even to different target fields', () => {
    const body = confirmationFromProposal(facts, proposal)
    const app = body.sheets.find((s) => s.sheetId === facts.find((f) => f.sheetName === 'APP')?.sheetId)
    app?.columns.push({ sourceColumn: 'ID', targetField: 'orderId' })

    const error = (() => {
      try {
        validateMappingConfirmation(body, facts)
      } catch (e) {
        return e
      }
    })()

    expect(error).toBeInstanceOf(MappingShapeError)
    expect((error as MappingShapeError).details).toMatchObject({ sheetName: 'APP', sourceColumn: 'ID' })
  })

  it('rejects a status that is not in the catalog, naming the sheet and the statusId', () => {
    const body = confirmationFromProposal(facts, proposal)
    const app = body.sheets.find((s) => s.sheetId === facts.find((f) => f.sheetName === 'APP')?.sheetId)
    if (app) app.statusId = 999
    const validated = validateMappingConfirmation(body, facts)

    expect(() => assertKnownStatuses(validated, RULES_FOR_PROVIDER_A.statuses)).toThrow(MappingShapeError)
    try {
      assertKnownStatuses(validated, RULES_FOR_PROVIDER_A.statuses)
    } catch (e) {
      expect((e as MappingShapeError).details).toEqual({
        sheetId: app?.sheetId,
        sheetName: 'APP',
        field: 'statusId',
        statusId: 999,
      })
    }
    expect(() =>
      assertKnownStatuses(
        validateMappingConfirmation(confirmationFromProposal(facts, proposal), facts),
        RULES_FOR_PROVIDER_A.statuses,
      ),
    ).not.toThrow()
  })
})
