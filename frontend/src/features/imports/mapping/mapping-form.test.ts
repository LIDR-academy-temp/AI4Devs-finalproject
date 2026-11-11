import { TRANSACTION_STATUSES } from '@recon/shared'
import { describe, expect, it } from 'vitest'
import type { ImportDetail } from '@/lib/api/types'
import { detailOf, importRecord, proposalBody, seedImport } from '@/test/msw/imports'
import {
  changeKind,
  mappingSchema,
  proposalLabel,
  type SheetForm,
  statusOptions,
  toMappingConfirmation,
  valuesFromDetail,
} from './mapping-form'

const sheetOf = (detail: ImportDetail, name: string) =>
  detail.files.flatMap((f) => f.sheets).find((s) => s.sheetName === name)!

const APP_PROPOSAL: SheetForm = {
  kind: 'transactions',
  cycle: 'E',
  statusId: 2,
  columns: [
    { sourceColumn: 'ID', targetField: 'transactionId' },
    { sourceColumn: 'Amount', targetField: 'amount' },
    { sourceColumn: 'Currency', targetField: 'currency' },
  ],
}

function issuesOf(sheets: Record<string, SheetForm>) {
  const result = mappingSchema.safeParse({ sheets })
  return result.success ? [] : result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
}

describe('initial values', () => {
  it('come from the proposal before the mapping is confirmed', () => {
    const detail = seedImport('batch-clean')
    const values = valuesFromDetail(detail)

    expect(Object.keys(values.sheets)).toHaveLength(10)
    expect(values.sheets[sheetOf(detail, 'APP').sheetId]).toEqual(APP_PROPOSAL)
    expect(values.sheets[sheetOf(detail, 'RR').sheetId]).toMatchObject({
      kind: 'transactions',
      cycle: 'R',
      statusId: null,
    })
    expect(values.sheets[sheetOf(detail, 'Settings').sheetId]).toMatchObject({ kind: 'ignore', cycle: null })
  })

  it('come from the confirmed mapping once it exists', () => {
    const { importId } = seedImport('batch-clean', { status: 'mapped' })
    const record = importRecord(importId)
    const app = record.files[0]!.sheets[0]!
    app.mapping = {
      kind: 'transactions',
      cycle: 'I',
      statusId: 5,
      statusName: 'Refund',
      columns: [{ sourceColumn: 'ID', targetField: 'transactionId' }],
    }

    const values = valuesFromDetail(detailOf(record))

    expect(values.sheets[app.sheetId]).toEqual({
      kind: 'transactions',
      cycle: 'I',
      statusId: 5,
      columns: [
        { sourceColumn: 'ID', targetField: 'transactionId' },
        { sourceColumn: 'Amount', targetField: null },
        { sourceColumn: 'Currency', targetField: null },
      ],
    })
  })
})

describe('toMappingConfirmation', () => {
  it('refuses a sheet without a type instead of sending it as ignore', () => {
    const detail = seedImport('bonus')
    const values = valuesFromDetail(detail)
    const bonus = sheetOf(detail, 'Bonus').sheetId
    expect(values.sheets[bonus]!.kind).toBeNull()

    expect(() => toMappingConfirmation(values, detail)).toThrow(/Bonus/)
  })

  it('turns the proposal of batch-clean into the body of every sheet', () => {
    const detail = seedImport('batch-clean')
    const body = toMappingConfirmation(valuesFromDetail(detail), detail)

    expect(body.sheets).toHaveLength(10)
    const byName = (name: string) => body.sheets.find((s) => s.sheetId === sheetOf(detail, name).sheetId)!
    for (const name of ['APP', 'DEC', 'CHB', 'REF', 'RDR', 'RR']) {
      expect(byName(name).columns.map((c) => c.sourceColumn)).toEqual(['ID', 'Amount', 'Currency'])
    }
    expect(byName('Other Fees')).toEqual({
      sheetId: sheetOf(detail, 'Other Fees').sheetId,
      kind: 'batch_fees',
      cycle: null,
      statusId: null,
      columns: [
        { sourceColumn: 'Type of Fee', targetField: 'feeType' },
        { sourceColumn: 'Amount', targetField: 'amount' },
        { sourceColumn: 'Currency', targetField: 'currency' },
      ],
    })
    for (const name of ['Duplicate Corrections', 'CHB Alerts', 'Settings']) {
      expect(byName(name)).toMatchObject({ kind: 'ignore', cycle: null, statusId: null, columns: [] })
    }
    expect(body).toEqual(proposalBody(importRecord(detail.importId)))
  })
})

describe('mappingSchema', () => {
  it('accepts the proposal of batch-clean', () => {
    expect(issuesOf(valuesFromDetail(seedImport('batch-clean')).sheets)).toEqual([])
  })

  it.each<[string, SheetForm, string]>([
    ['transactions without cycle', { ...APP_PROPOSAL, cycle: null }, 's1.cycle'],
    ['a reserve sheet with a status', { ...APP_PROPOSAL, cycle: 'R', statusId: 2 }, 's1.statusId'],
    [
      'batch fees with a cycle',
      { ...APP_PROPOSAL, kind: 'batch_fees', cycle: 'E', statusId: null, columns: [] },
      's1.cycle',
    ],
    ['no type chosen', { ...APP_PROPOSAL, kind: null, cycle: null, statusId: null }, 's1.kind'],
  ])('rejects %s', (_, sheet, path) => {
    expect(issuesOf({ s1: sheet }).map((i) => i.path)).toContain(`sheets.${path}`)
  })

  it('rejects a field mapped twice, on both columns of the sheet', () => {
    const issues = issuesOf({
      s1: {
        ...APP_PROPOSAL,
        columns: [
          { sourceColumn: 'ID', targetField: 'transactionId' },
          { sourceColumn: 'Amount', targetField: 'amount' },
          { sourceColumn: 'Currency', targetField: 'amount' },
        ],
      },
    })

    expect(issues).toEqual([
      { path: 'sheets.s1.columns.1.targetField', message: 'Amount is mapped twice in this sheet.' },
      { path: 'sheets.s1.columns.2.targetField', message: 'Amount is mapped twice in this sheet.' },
    ])
  })
})

describe('changeKind', () => {
  it('to batch fees clears cycle, status and the fields batch fees do not take', () => {
    expect(changeKind(APP_PROPOSAL, 'batch_fees')).toEqual({
      kind: 'batch_fees',
      cycle: null,
      statusId: null,
      columns: [
        { sourceColumn: 'ID', targetField: null },
        { sourceColumn: 'Amount', targetField: 'amount' },
        { sourceColumn: 'Currency', targetField: 'currency' },
      ],
    })
  })
})

describe('proposalLabel', () => {
  const none = { kind: null, cycle: null, statusId: null, statusName: null, source: 'none' } as const

  it.each([
    [
      { kind: 'transactions', cycle: 'I', statusId: 4, statusName: 'Chargeback', source: 'global' },
      'Proposed: I · Chargeback — global rule',
    ],
    [
      { kind: 'transactions', cycle: 'E', statusId: null, statusName: null, source: 'account' },
      'Proposed: E · status from column — account rule',
    ],
    [
      { kind: 'transactions', cycle: 'R', statusId: null, statusName: null, source: 'global' },
      'Proposed: R · reserve, no status — global rule',
    ],
    [
      { kind: 'batch_fees', cycle: null, statusId: null, statusName: null, source: 'global' },
      'Proposed: batch fees — global rule',
    ],
    [
      { kind: 'ignore', cycle: null, statusId: null, statusName: null, source: 'global' },
      'Proposed: ignore — global rule',
    ],
    [none, 'No proposal'],
  ] as const)('%o → %s', (proposed, label) => {
    expect(proposalLabel(proposed)).toBe(label)
  })
})

describe('statusOptions', () => {
  it('are the six statuses of TRANSACTION_STATUSES', () => {
    expect(statusOptions).toEqual(TRANSACTION_STATUSES.map((s) => ({ statusId: s.statusId, label: s.name })))
  })
})
