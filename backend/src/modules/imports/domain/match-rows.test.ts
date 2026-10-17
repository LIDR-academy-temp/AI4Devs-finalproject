import { describe, expect, it } from 'vitest'
import { matchRow, type TransactionRef } from './match-rows.js'

// Spec "Resultado del cruce" (design D4): one hit → matched, none → unmatched/no_match, several → ambiguous.
function transaction(overrides: Partial<TransactionRef>): TransactionRef {
  return {
    transactionId: 1n,
    gatewayId: 1,
    gatewayName: 'Gateway Numeric',
    sourceTransactionId: '252570479111759',
    channelId: 1001,
    channelName: 'RAM-01',
    providerId: 101,
    statusId: 2,
    statusName: 'Successful',
    amount: '16.2200',
    transactionDate: new Date('2026-10-01T12:00:00.000Z'),
    ...overrides,
  }
}

const ONE = [{ gatewayId: 1, sourceTransactionId: '252570479111759' }]
const TWO = [
  { gatewayId: 1, sourceTransactionId: '252570479111759' },
  { gatewayId: 9001, sourceTransactionId: '252570479111759' },
]

describe('matchRow', () => {
  it('matches the single transaction found and keeps it for the row', () => {
    const found = transaction({})

    expect(matchRow(ONE, [found])).toEqual({
      matchResult: 'matched',
      transactionId: 1n,
      gatewayId: 1,
      reason: null,
      candidates: [],
      transaction: found,
    })
  })

  it('is unmatched with reason no_match when nothing was found', () => {
    expect(matchRow(ONE, [])).toEqual({
      matchResult: 'unmatched',
      transactionId: null,
      gatewayId: null,
      reason: 'no_match',
      candidates: [],
      transaction: null,
    })
  })

  it('is ambiguous with the candidates ordered by gateway when two gateways hold the id', () => {
    const second = transaction({
      transactionId: 77n,
      gatewayId: 9001,
      gatewayName: 'Gateway Test',
      channelId: 9001,
      channelName: 'RAM-T1',
    })
    const first = transaction({})

    const outcome = matchRow(TWO, [second, first])

    expect(outcome).toMatchObject({
      matchResult: 'ambiguous',
      transactionId: null,
      gatewayId: null,
      reason: null,
      transaction: null,
    })
    expect(outcome.candidates).toEqual([
      {
        gatewayId: 1,
        gatewayName: 'Gateway Numeric',
        transactionId: '1',
        channelId: 1001,
        channelName: 'RAM-01',
        statusId: 2,
        statusName: 'Successful',
        amount: '16.2200',
      },
      {
        gatewayId: 9001,
        gatewayName: 'Gateway Test',
        transactionId: '77',
        channelId: 9001,
        channelName: 'RAM-T1',
        statusId: 2,
        statusName: 'Successful',
        amount: '16.2200',
      },
    ])
  })

  it('keeps only the exact (gatewayId, sourceTransactionId) pairs: the IN × IN lookup may return crossed rows', () => {
    const crossed = transaction({ transactionId: 5n, gatewayId: 9001, sourceTransactionId: '999999999999999' })
    const exact = transaction({})

    expect(matchRow(ONE, [crossed, exact])).toMatchObject({ matchResult: 'matched', transactionId: 1n })
    expect(matchRow(ONE, [crossed])).toMatchObject({ matchResult: 'unmatched', reason: 'no_match' })
  })
})
