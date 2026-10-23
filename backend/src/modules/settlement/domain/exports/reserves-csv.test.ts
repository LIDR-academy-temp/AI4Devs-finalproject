import { describe, expect, it } from 'vitest'
import { expectedOf } from '../../../validation/test-support/builders.js'
import { dataLines, exportRow, sampleExportRows } from '../../test-support/export-rows.js'
import { reservesCsv } from './reserves-csv.js'

// Spec settlement "Exports", scenario "RR de batch-clean" (design D6, gate P1 and P3): ID,Description with the R
// movements, "Batch <batchNo>", one row per distinct ID.
describe('RR of batch-clean against its expected.json', async () => {
  const qty = (expectedOf('batch-clean').summary as unknown as { qty: Record<string, number> }).qty
  const { body, rows } = reservesCsv(await sampleExportRows('batch-clean'), 123)
  const lines = dataLines(body)

  it('has the header ID,Description and 320 rows, as many as it reports', () => {
    expect(body.startsWith('ID,Description\r\n')).toBe(true)
    expect(lines).toHaveLength(qty.reservesReleased)
    expect(rows).toBe(qty.reservesReleased)
  })

  it('describes every row as Batch 123', () => {
    expect(lines.every((l) => l.endsWith(',Batch 123'))).toBe(true)
  })
})

describe('reservesCsv with built rows', () => {
  it('writes only the R movements, whatever their status', () => {
    const { body } = reservesCsv(
      [
        exportRow('911545593909470', 'E', 'Successful'),
        exportRow('911545593909471', 'I', 'Chargeback'),
        exportRow('911545593909472', 'R', 'Successful'),
        exportRow('911545593909473', 'R', 'Chargeback'),
      ],
      7,
    )
    expect(dataLines(body)).toEqual(['911545593909472,Batch 7', '911545593909473,Batch 7'])
  })

  it('writes an R duplicate included by hand once', () => {
    const { body, rows } = reservesCsv(
      [exportRow('911545593909472', 'R', 'Successful'), exportRow('911545593909472', 'R', 'Successful')],
      7,
    )
    expect(dataLines(body)).toEqual(['911545593909472,Batch 7'])
    expect(rows).toBe(1)
  })

  it('keeps an R whose released reserve is 0 (gate P3)', () => {
    // The export rows carry no amounts: an R movement is written whatever it released.
    const { rows } = reservesCsv([exportRow('911545593909472', 'R', 'Chargeback')], 7)
    expect(rows).toBe(1)
  })

  it('writes the ID as it is, also a UUID', () => {
    const uuid = '4f0c2d1e-9a7b-4c3d-8e6f-1a2b3c4d5e6f'
    expect(dataLines(reservesCsv([exportRow(uuid, 'R', 'Successful')], 7).body)).toEqual([`${uuid},Batch 7`])
  })
})
