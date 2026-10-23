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
  it('in its card, the title names it, six rows in order and one I range spanning three', () => {
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
    // In its own card, whose title names the table (ui-polish review 12.2).
    const card = table().closest<HTMLElement>('[data-slot="card"]')
    expect(within(card!).getByText('Date ranges of this test')).toHaveAttribute('data-slot', 'card-title')
  })
})
