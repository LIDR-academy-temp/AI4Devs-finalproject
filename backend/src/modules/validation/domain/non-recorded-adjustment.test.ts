import type { TransactionStatusCode } from '@recon/shared'
import { describe, expect, it } from 'vitest'
import type { StatusCode } from '../../../../prisma/synthetic.js'
import { input, resultOf, row, STATUS, STATUSES } from '../test-support/builders.js'
import { sampleInput } from '../test-support/sample-input.js'
import { runValidations } from './run-validations.js'
import type { StatusEntry, ValidationRow } from './types.js'

// Spec "non_recorded_adjustment", "Ajuste no registrado en ciclo I" and "status_mismatch en ciclo E" (business
// decision 2; questions 4 and 12). Both issue types are non-blocking and leave the row included (nothing excludes it).
const nra = (rows: ValidationRow[]) => resultOf(runValidations(input({ rows })), 'non_recorded_adjustment')

describe('non_recorded_adjustment', () => {
  it('batch-issues: warning with 3 findings — one non_recorded_adjustment in I and two status_mismatch in E', async () => {
    const result = resultOf(runValidations((await sampleInput('batch-issues')).input), 'non_recorded_adjustment')

    expect(result).toMatchObject({ outcome: 'warning', issueCount: 3 })
    expect(result.issues.every((i) => !i.blocking && i.occurrences.length === 0)).toBe(true)
    const adjustments = result.issues.filter((i) => i.issueType === 'non_recorded_adjustment')
    expect(adjustments.map((i) => i.transactionIdRaw)).toEqual(['281520820250015'])
    expect(adjustments[0]).toMatchObject({
      cycle: 'I',
      statusId: STATUS.Chargeback,
      gatewayStatusId: STATUS.Successful,
    })
    const mismatches = result.issues.filter((i) => i.issueType === 'status_mismatch')
    expect(mismatches.map((i) => i.transactionIdRaw).sort()).toEqual(['381797111970492', '911545593909470'])
    for (const m of mismatches) {
      expect(m).toMatchObject({
        cycle: 'E',
        scope: null,
        statusId: STATUS.Declined,
        gatewayStatusId: STATUS.Successful,
      })
      expect(m.source).toBeDefined()
    }
  })

  it('batch-clean: passed although some APP rows are already Chargeback/Refund in the gateway (round 1)', async () => {
    const { input: sample } = await sampleInput('batch-clean')
    const roundOne = sample.rows.filter(
      (r) => r.cycle === 'E' && r.transaction !== null && r.transaction.statusId >= STATUS.Chargeback,
    )

    expect(roundOne.length).toBeGreaterThan(0)
    expect(resultOf(runValidations(sample), 'non_recorded_adjustment')).toMatchObject({
      outcome: 'passed',
      issueCount: 0,
    })
  })

  it('batch-blocked (no I rows, matched rows present): passed, not not_applicable', async () => {
    expect(
      resultOf(runValidations((await sampleInput('batch-blocked')).input), 'non_recorded_adjustment').outcome,
    ).toBe('passed')
  })

  it.each<StatusCode>(['Pending', 'Successful', 'Declined'])(
    'an I row with the gateway %s is a non_recorded_adjustment',
    (gateway) => {
      const result = nra([row({ cycle: 'I', status: 'Chargeback', gateway })])

      expect(result.issues).toHaveLength(1)
      expect(result.issues[0]).toMatchObject({
        issueType: 'non_recorded_adjustment',
        cycle: 'I',
        blocking: false,
        statusId: STATUS.Chargeback,
        gatewayStatusId: STATUS[gateway],
      })
    },
  )

  it('an I row whose gateway holds an I status is not a finding', () => {
    expect(nra([row({ cycle: 'I', status: 'Chargeback', gateway: 'Refund' })]).issues).toEqual([])
  })

  it('an APP row with the gateway Declined is a status_mismatch', () => {
    const result = nra([row({ status: 'Successful', gateway: 'Declined' })])

    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]).toMatchObject({
      issueType: 'status_mismatch',
      cycle: 'E',
      statusId: STATUS.Successful,
      gatewayStatusId: STATUS.Declined,
      blocking: false,
    })
  })

  it.each<StatusCode>(['Successful', 'Chargeback', 'Refund', 'RDR'])(
    'a DEC row with the gateway %s is a status_mismatch',
    (gateway) => {
      const result = nra([row({ status: 'Declined', gateway })])

      expect(result.issues.map((i) => i.issueType)).toEqual(['status_mismatch'])
    },
  )

  it('APP or DEC rows with the gateway Pending are not compared', () => {
    expect(
      nra([row({ status: 'Successful', gateway: 'Pending' }), row({ status: 'Declined', gateway: 'Pending' })]).issues,
    ).toEqual([])
  })

  it.each<StatusCode>(['Chargeback', 'Refund', 'RDR'])(
    'an APP row with the gateway %s is not a finding (question 12)',
    (gateway) => {
      expect(nra([row({ status: 'Successful', gateway })]).issues).toEqual([])
    },
  )

  it('a DEC row whose gateway holds a status the rule does not list (a new catalog status) is no status_mismatch (L1)', () => {
    const onHold: StatusEntry = { statusId: 7, code: 'OnHold' as TransactionStatusCode, cycle: 'E' }
    const declined = row({ status: 'Declined' })
    const rows = [{ ...declined, transaction: { ...declined.transaction!, statusId: 7 } }]

    const result = resultOf(runValidations(input({ rows, statuses: [...STATUSES, onHold] })), 'non_recorded_adjustment')

    expect(result).toMatchObject({ outcome: 'passed', issueCount: 0 })
  })

  it('without any matched row: not_applicable (question 4)', () => {
    expect(nra([row({ matchResult: 'unmatched', cycle: 'I', status: 'Chargeback' })]).outcome).toBe('not_applicable')
  })

  it('foreign rows produce neither non_recorded_adjustment nor status_mismatch', () => {
    const result = nra([
      row({ providerId: 101, channelId: 1001, cycle: 'I', status: 'Chargeback', gateway: 'Successful' }),
      row({ transactionId: 2n, providerId: 101, channelId: 1001, status: 'Declined', gateway: 'Successful' }),
    ])

    expect(result).toMatchObject({ outcome: 'passed', issueCount: 0 })
  })
})
