import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatCard } from './StatCard'

// The frame of the counter cards, shared by Analysis and Validations (web-analysis-polish design D2).
describe('StatCard', () => {
  it('is a region named by its label, with the label and the value', () => {
    render(<StatCard label="Rows read" value={780} />)

    const card = screen.getByRole('region', { name: 'Rows read' })
    expect(within(card).getByText('Rows read')).toBeInTheDocument()
    expect(within(card).getByText('780')).toBeInTheDocument()
  })

  it('shows the info slot next to the label', () => {
    render(<StatCard label="Pending in range" value={0} info={<button type="button">About Pending in range</button>} />)

    const card = screen.getByRole('region', { name: 'Pending in range' })
    const label = within(card).getByText('Pending in range')
    const info = within(card).getByRole('button', { name: 'About Pending in range' })
    // Both in the first line of the card, the label first.
    expect(label.parentElement).toBe(info.parentElement)
    expect(label.compareDocumentPosition(info) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('has a neutral tone unless told otherwise, whatever the value', () => {
    render(<StatCard label="Undated adjustments" value={1} />)

    expect(screen.getByRole('region', { name: 'Undated adjustments' })).not.toHaveAttribute('data-state')
  })

  it('warns only with tone="warning"', () => {
    render(<StatCard label="Unmatched" value={3} tone="warning" />)

    expect(screen.getByRole('region', { name: 'Unmatched' })).toHaveAttribute('data-state', 'warning')
  })

  it('keeps its name and value with size="compact"', () => {
    render(<StatCard label="By cycle" value="E 700 · I 60 · R 20" size="compact" />)

    const card = screen.getByRole('region', { name: 'By cycle' })
    expect(within(card).getByText('E 700 · I 60 · R 20')).toBeInTheDocument()
  })

  it('renders its children after the value', () => {
    render(
      <StatCard label="Unmatched" value={3} tone="warning">
        <a href="#rows">Show unmatched rows</a>
      </StatCard>,
    )

    const card = screen.getByRole('region', { name: 'Unmatched' })
    const value = within(card).getByText('3')
    const link = within(card).getByRole('link', { name: 'Show unmatched rows' })
    expect(value.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
