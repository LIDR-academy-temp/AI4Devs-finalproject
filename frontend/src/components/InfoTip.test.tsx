import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { InfoTip } from './InfoTip'

// The first use of the tooltip of components/ui: a real button, reachable with the keyboard, whose explanation is its
// accessible description also while the tooltip is closed (web-analysis-polish design D4).
const LABEL = 'About Pending in range'
const TEXT = "Transactions of the account's channels still Pending on the gateway, created within the APP or DEC range."

function renderTip() {
  render(
    <>
      <button type="button">Before</button>
      <InfoTip label={LABEL} description={TEXT} />
    </>,
  )
  return userEvent.setup()
}

describe('InfoTip', () => {
  it('is a button named by its label that Tab reaches', async () => {
    const user = renderTip()

    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: LABEL })).toHaveFocus()
  })

  it('opens on focus with its explanation, and Escape closes it leaving the focus on the button', async () => {
    const user = renderTip()
    const button = screen.getByRole('button', { name: LABEL })

    await user.tab()
    await user.tab()
    expect(await screen.findByRole('tooltip')).toHaveTextContent(TEXT)

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(button).toHaveFocus()
  })

  it('opens when the pointer rests on the button', async () => {
    const user = renderTip()

    await user.hover(screen.getByRole('button', { name: LABEL }))
    expect(await screen.findByRole('tooltip')).toHaveTextContent(TEXT)
  })

  it('has its explanation as accessible description while the tooltip is closed', () => {
    renderTip()

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: LABEL })).toHaveAccessibleDescription(TEXT)
    // One text: the one the button points to is the one read where the button sits (design D3, D4).
    expect(screen.getAllByText(TEXT)).toHaveLength(1)
  })
})
