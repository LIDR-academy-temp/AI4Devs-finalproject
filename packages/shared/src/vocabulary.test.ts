import { describe, expect, it } from 'vitest'
import {
  ChannelAssignment,
  IntId,
  ReadinessField,
  RowReason,
  TRANSACTION_STATUSES,
  TransactionStatusCode,
  WarningCode,
} from './vocabulary.js'

describe('TRANSACTION_STATUSES (design D6)', () => {
  it('has the six statuses with statusId 1…6 in order', () => {
    expect(TRANSACTION_STATUSES.map((s) => s.statusId)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('uses exactly the codes of TransactionStatusCode', () => {
    expect(TRANSACTION_STATUSES.map((s) => s.code)).toEqual(TransactionStatusCode.options)
  })

  it('puts Pending, Successful and Declined in cycle E and Chargeback, Refund and RDR in cycle I', () => {
    expect(Object.fromEntries(TRANSACTION_STATUSES.map((s) => [s.code, s.cycle]))).toEqual({
      Pending: 'E',
      Successful: 'E',
      Declined: 'E',
      Chargeback: 'I',
      Refund: 'I',
      RDR: 'I',
    })
  })
})

describe('analysis vocabulary (spec "Resumen del análisis", "Resultado del cruce", "Aviso de canales")', () => {
  it('WarningCode lists the nine warning codes of the analysis', () => {
    expect(WarningCode.options).toEqual([
      'negative_amount',
      'non_usd_currency',
      'amount_unparsed',
      'currency_invalid',
      'id_length',
      'lossy_numeric_id',
      'status_unresolved',
      'status_differs_from_sheet',
      'cycle_mismatch',
    ])
  })

  it('RowReason lists why a row is unmatched or ignored', () => {
    expect(RowReason.options).toEqual(['no_match', 'id_format', 'lossy_numeric_id', 'empty_id', 'no_gateways'])
  })

  it('ChannelAssignment and ReadinessField are closed lists', () => {
    expect(ChannelAssignment.options).toEqual(['assigned', 'unassigned', 'assigned_to_other_account'])
    expect(ReadinessField.options).toEqual(['kind', 'cycle', 'status', 'transactionId', 'transactions', 'confirmation'])
    expect(WarningCode.safeParse('odd').success).toBe(false)
  })
})

describe('IntId', () => {
  it('coerces a path segment to a positive integer', () => {
    expect(IntId.parse('101')).toBe(101)
  })

  it('accepts the largest value of an INT column', () => {
    expect(IntId.parse('2147483647')).toBe(2_147_483_647)
  })

  it.each(['2147483648', '99999999999', '0', '-1', '1.5', 'abc', '1e3', '0x10', ' 12'])('rejects %s', (value) => {
    expect(IntId.safeParse(value).success).toBe(false)
  })
})
