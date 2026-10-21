import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { businessDate } from '@/lib/format'
import { DateRangesTable } from './DateRangesTable'

// Shared table of date ranges by cycle and status (ui-polish design D9).
const range = (min: string, max: string) => ({ min: businessDate(min), max: businessDate(max) })
const RANGES = {
  APP: range('2026-09-28T00:00:00.000Z', '2026-10-07T23:59:00.000Z'),
  DEC: null,
  I: range('2026-09-28T00:00:00.000Z', '2026-10-11T00:00:00.000Z'),
  R: range('2026-03-31T00:00:00.000Z', '2026-04-09T00:00:00.000Z'),
}

const table = () => screen.getByRole('table', { name: 'Date ranges of this test' })
const headers = () =>
  within(table())
    .getAllByRole('columnheader')
    .map((h) => h.textContent)
const bodyRows = () => within(table()).getAllByRole('row').slice(1)
const cellsOf = (row: HTMLElement) =>
  within(row)
    .getAllByRole('cell')
    .map((c) => c.textContent)

describe('DateRangesTable', () => {
  it('without transactions: the caption names it, six rows in order and one I range spanning three', () => {
    render(<DateRangesTable title="Date ranges of this test" ranges={RANGES} />)

    expect(headers()).toEqual(['Cycle', 'Status', 'Date range'])
    expect(bodyRows().map(cellsOf)).toEqual([
      ['E', 'APP', '2026-09-28 00:00 ET – 2026-10-07 23:59 ET'],
      ['E', 'DEC', '—'],
      ['I', 'CHB', '2026-09-28 00:00 ET – 2026-10-11 00:00 ET'],
      ['I', 'REF'],
      ['I', 'RDR'],
      ['R', '—', '2026-03-31 00:00 ET – 2026-04-09 00:00 ET'],
    ])
    const iRange = within(bodyRows()[2]!).getAllByRole('cell')[2]!
    expect(iRange).toHaveAttribute('rowspan', '3')
  })

  it('with transactions: the Transactions column with the values as they arrive', () => {
    render(
      <DateRangesTable
        title="Date ranges of this test"
        ranges={RANGES}
        transactions={{ APP: 12, DEC: 0, CHB: 2, REF: 1, RDR: 0, R: 3 }}
      />,
    )

    expect(headers()).toEqual(['Cycle', 'Status', 'Transactions', 'Date range'])
    expect(bodyRows().map(cellsOf)).toEqual([
      ['E', 'APP', '12', '2026-09-28 00:00 ET – 2026-10-07 23:59 ET'],
      ['E', 'DEC', '0', '—'],
      ['I', 'CHB', '2', '2026-09-28 00:00 ET – 2026-10-11 00:00 ET'],
      ['I', 'REF', '1'],
      ['I', 'RDR', '0'],
      ['R', '—', '3', '2026-03-31 00:00 ET – 2026-04-09 00:00 ET'],
    ])
  })
})
