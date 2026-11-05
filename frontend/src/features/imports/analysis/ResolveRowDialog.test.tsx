// Where the focus goes when the confirmation closes (web-ambiguous-rows design D4, review 1). Radix's AlertDialog
// prevents its own return and focuses its trigger, and this dialog has none: by itself the focus would end on the
// body. So the dialog gives it back to the Choose that opened it when closed without resolving (Keep, Escape), and
// after a 200, when that Choose disappears, leaves it to the heading of the rows.
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeAmbiguousRow } from '@/test/msw/import-fixtures'
import { ResolveRowDialog, type RowChoice } from './ResolveRowDialog'

const { row } = makeAmbiguousRow()
const noop = () => {}

function Screen({ open, returnFocus }: { open: boolean; returnFocus: boolean }) {
  // The Choose that opens the dialog travels with the choice, as AmbiguousCandidates passes it.
  const opener = document.querySelector<HTMLButtonElement>('button[data-opener]')
  const choice: RowChoice = { row, candidate: row.candidates[0]!, warnRun: false, opener }
  return (
    <>
      <button type="button" data-opener>
        Choose
      </button>
      <h3 tabIndex={-1}>Rows</h3>
      <ResolveRowDialog
        choice={open ? choice : null}
        pending={false}
        returnFocus={returnFocus}
        onConfirm={noop}
        onClose={noop}
      />
    </>
  )
}

/** Opens the dialog from the focused Choose, as a click on it does. */
function openFromChoose(returnFocus: boolean) {
  const view = render(<Screen open={false} returnFocus={returnFocus} />)
  screen.getByRole('button', { name: 'Choose' }).focus()
  view.rerender(<Screen open returnFocus={returnFocus} />)
  expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  return view
}

/** Lets Radix run its return of the focus, scheduled with setTimeout(0) after the dialog unmounts. */
const afterRadixReturn = () => new Promise((resolve) => setTimeout(resolve, 20))

describe('ResolveRowDialog: the focus when it closes', () => {
  it('after a resolution it does not take the focus back to Choose: the heading keeps it', async () => {
    const view = openFromChoose(true)

    view.rerender(<Screen open={false} returnFocus={false} />)
    // What ListHeading does when the resolution changes its key.
    screen.getByRole('heading', { name: 'Rows' }).focus()
    await afterRadixReturn()

    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Rows' }))
  })

  it('closed without resolving (Keep, Escape) it gives the focus back to the Choose that opened it', async () => {
    const view = openFromChoose(true)

    view.rerender(<Screen open={false} returnFocus />)

    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Choose' })))
  })
})
