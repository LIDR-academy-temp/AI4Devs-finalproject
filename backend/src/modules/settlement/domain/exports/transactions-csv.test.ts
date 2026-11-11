import { describe, expect, it } from 'vitest'
import { expectedOf } from '../../../validation/test-support/builders.js'
import { dataLines, exportRow, sampleExportRows } from '../../test-support/export-rows.js'
import { transactionsCsv } from './transactions-csv.js'

// Spec settlement "Exports" (design D6, gate P1 and P2): ID,Status with SUC/CHB/REF/RDR, no Declined, one row per
// distinct (ID, Status), the ID as it is.
interface Summary {
  qty: Record<string, number>
}
const qtyOf = (name: 'batch-clean' | 'legacy-provider') => (expectedOf(name).summary as unknown as Summary).qty
const countBy = (lines: string[]) =>
  lines.reduce<Record<string, number>>((acc, line) => {
    const status = line.split(',')[1]!
    acc[status] = (acc[status] ?? 0) + 1
    return acc
  }, {})

describe('TXN of batch-clean against its expected.json', async () => {
  const qty = qtyOf('batch-clean')
  const { body, rows } = transactionsCsv(await sampleExportRows('batch-clean'))
  const lines = dataLines(body)

  it('has the header ID,Status and 350 rows, as many as it reports', () => {
    expect(body.startsWith('ID,Status\r\n')).toBe(true)
    expect(lines).toHaveLength(350)
    expect(rows).toBe(350)
  })

  it('has 340 SUC, 2 CHB, 6 REF and 2 RDR, and none of the 110 declined', () => {
    expect(countBy(lines)).toEqual({ SUC: qty.deposit, CHB: qty.chargeback, REF: qty.refund, RDR: qty.rdr })
  })

  it('writes every E before every I', () => {
    const firstAdjustment = lines.findIndex((l) => !l.endsWith(',SUC'))
    expect(lines.slice(firstAdjustment).every((l) => !l.endsWith(',SUC'))).toBe(true)
  })
})

describe('TXN of legacy-provider: CHB 2 in the TXN', async () => {
  const qty = qtyOf('legacy-provider')
  const [chb2Id] = expectedOf('legacy-provider').excludeAmountRows as string[]
  const { body } = transactionsCsv(await sampleExportRows('legacy-provider'))
  const lines = dataLines(body)

  it('writes the CHB 2 row (excludeAmount) as CHB: 61 rows, 60 SUC and 1 CHB', () => {
    expect(lines).toHaveLength(61)
    expect(countBy(lines)).toEqual({ SUC: qty.deposit, CHB: qty.chargeback })
    expect(lines).toContain(`${chb2Id},CHB`)
  })
})

describe('transactionsCsv with built rows', () => {
  it('writes a Refund and a Chargeback of the same transaction as two rows', () => {
    const { body } = transactionsCsv([
      exportRow('911545598812004', 'I', 'Chargeback'),
      exportRow('911545598812004', 'I', 'Refund'),
    ])
    expect(dataLines(body)).toEqual(['911545598812004,CHB', '911545598812004,REF'])
  })

  it('writes a Chargeback and a CHB 2 of the same transaction as one CHB row (CHB 2 is stored as Chargeback)', () => {
    const { body, rows } = transactionsCsv([
      exportRow('911545598812004', 'I', 'Chargeback'),
      exportRow('911545598812004', 'I', 'Chargeback'),
    ])
    expect(dataLines(body)).toEqual(['911545598812004,CHB'])
    expect(rows).toBe(1)
  })

  it('writes an E duplicate included by hand once', () => {
    const { body } = transactionsCsv([
      exportRow('911545593909470', 'E', 'Successful'),
      exportRow('911545593909470', 'E', 'Successful'),
    ])
    expect(dataLines(body)).toEqual(['911545593909470,SUC'])
  })

  it('leaves out Declined and R movements', () => {
    const { body, rows } = transactionsCsv([
      exportRow('911545593909470', 'E', 'Declined'),
      exportRow('911545593909471', 'R', 'Successful'),
    ])
    expect(body).toBe('ID,Status\r\n')
    expect(rows).toBe(0)
  })

  it("keeps the reader's order and does not sort by ID", () => {
    const { body } = transactionsCsv([
      exportRow('911545593909479', 'E', 'Successful'),
      exportRow('911545593909470', 'E', 'Successful'),
      exportRow('911545593909475', 'I', 'RDR'),
      exportRow('911545593909471', 'I', 'Refund'),
    ])
    expect(dataLines(body)).toEqual([
      '911545593909479,SUC',
      '911545593909470,SUC',
      '911545593909475,RDR',
      '911545593909471,REF',
    ])
  })

  it('writes the ID as it is: 15 and 16 digits and a UUID, with nothing for Excel', () => {
    const ids = ['911545593909470', '9115455939094701', '4f0c2d1e-9a7b-4c3d-8e6f-1a2b3c4d5e6f']
    const { body } = transactionsCsv(ids.map((id) => exportRow(id, 'E', 'Successful')))
    expect(dataLines(body)).toEqual(ids.map((id) => `${id},SUC`))
    expect(body).not.toMatch(/="|'|"|E\+/)
  })

  it('starts without BOM and ends every line in CRLF (spec "Bytes del TXN")', () => {
    const { body } = transactionsCsv([exportRow('911545593909470', 'E', 'Successful')])
    expect(body).toBe('ID,Status\r\n911545593909470,SUC\r\n')
  })
})
