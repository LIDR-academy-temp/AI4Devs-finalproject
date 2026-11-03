import { afterEach, describe, expect, it } from 'vitest'
import { focusAfterWrite } from './fee-focus'

// Spec fees "Pantalla Account Fees: foco tras escribir y ante un error local". The screen tests cover a fee still in
// the list; a fee that left it cannot be produced through the fake, so the fallback is checked here.
afterEach(() => {
  document.body.innerHTML = ''
})

function page() {
  document.body.innerHTML = `
    <h2 tabindex="-1">Fees of the account</h2>
    <button data-fee-history="fee-1">History</button>
    <button data-fee-history="fee-2">History</button>`
  return document.querySelector('h2') as HTMLElement
}

describe('focusAfterWrite', () => {
  it('focuses the History button of the written fee', () => {
    const heading = page()

    focusAfterWrite('fee-2', heading)

    expect(document.activeElement).toBe(document.querySelector('[data-fee-history="fee-2"]'))
  })

  it('falls back to the heading of the table when the fee is no longer in the list', () => {
    const heading = page()

    focusAfterWrite('fee-9', heading)

    expect(document.activeElement).toBe(heading)
  })
})
