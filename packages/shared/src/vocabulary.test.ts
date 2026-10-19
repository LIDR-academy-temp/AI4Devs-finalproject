import { describe, expect, it } from 'vitest'
import {
  ChannelAssignment,
  IntId,
  IsoDate,
  Money,
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

describe('Money (DECIMAL(19,4): at most 15 integer digits)', () => {
  it.each(['0', '-42.5', '150', '1.0001', '999999999999999', '-999999999999999.9999'])('accepts %s', (value) => {
    expect(Money.safeParse(value).success).toBe(true)
  })

  it.each(['1000000000000000', '-1000000000000000.5', '1234567890123456789.1', '1.00001', '.5', '1.', ''])(
    'rejects %s',
    (value) => {
      expect(Money.safeParse(value).success).toBe(false)
    },
  )
})

describe('IsoDate (a calendar date)', () => {
  it.each(['2026-10-24', '2026-01-31', '2026-12-31', '2028-02-29', '2000-02-29', '0001-01-01'])(
    'accepts %s',
    (value) => {
      expect(IsoDate.safeParse(value).success).toBe(true)
    },
  )

  it.each([
    '2026-13-01',
    '2026-00-10',
    '2026-02-30',
    '2026-02-29',
    '1900-02-29',
    '2026-04-31',
    '2026-10-00',
    '2026-10-32',
    '0000-01-01',
    '24/10/2026',
  ])('rejects %s', (value) => {
    expect(IsoDate.safeParse(value).success).toBe(false)
  })
})
