import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { seedImport } from '@/test/msw/imports'
import { reserveVariant, seedValidationRun, validationRequests } from '@/test/msw/validations'
import { renderApp } from '@/test/render'
import { OPENING } from '@/test/validation-screens'

/** Moves the focus with Tab only until it reaches the element `matches` accepts. */
async function tabTo(user: UserEvent, matches: (element: Element) => boolean, limit = 200) {
  for (let i = 0; i < limit; i++) {
    await user.tab()
    if (document.activeElement && matches(document.activeElement)) return document.activeElement as HTMLElement
  }
  throw new Error('the element was not reached with Tab')
}

const named = (name: string | RegExp) => (element: Element) =>
  typeof name === 'string'
    ? element.textContent === name || element.getAttribute('aria-label') === name
    : name.test(element.getAttribute('aria-label') ?? element.textContent ?? '')

describe('Analysis & Validations: keyboard (design D14)', () => {
  it('with Tab, Enter, Space and Escape: choose a validation, open a finding, change an inclusion, confirm, back to the list', async () => {
    const { importId } = seedImport('batch-issues', { status: 'validated' })
    seedValidationRun(importId, undefined, { reviewedBy: 'analyst' })
    const { user } = renderApp(`/imports/${importId}?step=analysis`, { as: 'analyst' })
    await screen.findByRole('table', { name: 'Validation results' }, OPENING)

    await tabTo(user, named('Duplicate in batch'))
    await user.keyboard('{Enter}')
    await screen.findByRole('table', { name: 'Findings' })

    const opener = await tabTo(user, named('441706751475644'))
    await user.keyboard('{Enter}')
    const drawer = await screen.findByRole('dialog')

    await tabTo(user, named(/row 233$/))
    await user.keyboard(' ')
    const question = await screen.findByRole('alertdialog')
    await tabTo(user, named('Change the inclusion'))
    await user.keyboard('{Enter}')
    await waitFor(() => expect(validationRequests('inclusion')).toHaveLength(1))
    await waitFor(() => expect(question).not.toBeInTheDocument())
    await waitFor(() => expect(within(drawer).getByRole('switch', { name: /row 233$/ })).toBeChecked())

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('every disabled control of the decision and of the drawer has a visible reason linked to it', async () => {
    const { importId } = seedImport('batch-blocked', { status: 'analyzed' })
    seedValidationRun(importId)
    renderApp(`/imports/${importId}?step=analysis`, { as: 'analyst' })
    const decision = await screen.findByRole('region', { name: 'Decision' }, OPENING)
    const disabled = within(decision)
      .getAllByRole('button')
      .filter((b) => b.hasAttribute('disabled'))
    expect(disabled.length).toBeGreaterThan(0)
    for (const button of disabled) expect(button).toHaveAccessibleDescription(/\S/)
  })

  it('a switch that cannot be turned on says why', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const { issues } = seedValidationRun(importId, reserveVariant())
    const reserve = issues.find((i) => i.validationCode === 'duplicate_in_batch' && i.cycle === 'R')!
    renderApp(`/imports/${importId}?step=analysis&issue=${reserve.issueId}`, { as: 'analyst' })
    const drawer = within(await screen.findByRole('dialog', {}, OPENING))

    const disabled = drawer.getAllByRole('switch').filter((s) => s.hasAttribute('disabled'))
    expect(disabled).toHaveLength(1)
    for (const control of disabled) expect(control).toHaveAccessibleDescription(/\S/)
  })
})
