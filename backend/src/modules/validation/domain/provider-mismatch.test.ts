import { describe, expect, it } from 'vitest'
import { allIssues, input, jsonOf, resultOf, row, STATUS } from '../test-support/builders.js'
import { sampleInput } from '../test-support/sample-input.js'
import { runValidations } from './run-validations.js'

// Spec "Solo provider_mismatch bloquea", "provider_mismatch" and "Nada de otro merchant en el informe" (design D6, D7;
// questions 3 and 4).
describe('provider_mismatch', () => {
  it('batch-blocked: one blocking finding for the RAM-01 row; the result and the run are blocked', async () => {
    const report = runValidations((await sampleInput('batch-blocked')).input)
    const result = resultOf(report, 'provider_mismatch')

    expect(result).toMatchObject({ outcome: 'blocked', issueCount: 1 })
    expect(result.issues[0]).toMatchObject({
      issueType: 'provider_mismatch',
      scope: null,
      blocking: true,
      transactionIdRaw: '252570479111759',
      cycle: 'E',
      statusId: STATUS.Successful,
    })
    expect(result.issues[0]?.source).toMatchObject({ sheetId: expect.any(String), rowNo: expect.any(Number) })
    expect(report.blocked).toBe(true)
  })

  it('batch-clean: passed, and the run is not blocked', async () => {
    const report = runValidations((await sampleInput('batch-clean')).input)

    expect(resultOf(report, 'provider_mismatch')).toMatchObject({ outcome: 'passed', issueCount: 0 })
    expect(report.blocked).toBe(false)
  })

  it('without any matched row: not_applicable', () => {
    const report = runValidations(
      input({ rows: [row({ matchResult: 'unmatched' }), row({ matchResult: 'ambiguous' })] }),
    )

    expect(resultOf(report, 'provider_mismatch').outcome).toBe('not_applicable')
  })

  it('a foreign row repeated in APP gives two provider_mismatch and no duplicate (question 3)', () => {
    const rows = [
      row({ transactionId: 5n, providerId: 101, channelId: 1001, rowNo: 2 }),
      row({ transactionId: 5n, providerId: 101, channelId: 1001, rowNo: 3 }),
      row({ transactionId: 6n, rowNo: 4 }),
    ]
    const report = runValidations(input({ rows }))

    expect(resultOf(report, 'provider_mismatch').issueCount).toBe(2)
    expect(allIssues(report).filter((i) => i.issueType !== 'provider_mismatch')).toEqual([])
  })

  it('a row of another merchant carries no channel, date nor gateway status of that transaction (D7)', () => {
    const foreign = row({
      transactionId: 9_001n,
      transactionIdRaw: '9b2f6c1e-0000-4000-8000-000000009001',
      providerId: 201,
      channelId: 2001,
      status: 'Successful',
      gateway: 'Declined',
      date: new Date('2026-09-30T08:15:00.000Z'),
      changedAt: new Date('2026-10-02T09:00:00.000Z'),
    })
    const issue = resultOf(runValidations(input({ rows: [foreign] })), 'provider_mismatch').issues[0]!
    const serialized = jsonOf(issue)

    expect(issue.statusId).toBe(STATUS.Successful)
    expect(issue.gatewayStatusId).toBeUndefined()
    expect(serialized).not.toContain('channelId')
    expect(serialized).not.toContain('2001')
    expect(serialized).not.toContain('2026-')
    expect(serialized).not.toContain('providerId')
    expect(serialized).toContain('"transactionId":"9001"')
  })
})
