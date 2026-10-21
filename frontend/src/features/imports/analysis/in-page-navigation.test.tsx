import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { seedImport } from '@/test/msw/imports'
import { batchBlockedFixture, batchIssuesFixture, seedValidationRun } from '@/test/msw/validations'
import { renderApp } from '@/test/render'
import { focusOnAListHeading, watchScroll } from '@/test/scroll'
import { OPENING } from '@/test/validation-screens'

// Spec web-shell "Navegación dentro de la página: desplazamiento y foco" in Analysis & Validations (design D13).
const FINDINGS = 'Findings of Missing previous to batch'

async function openAnalysis(importId: string, search = '') {
  const scroll = watchScroll()
  const view = renderApp(`/imports/${importId}?step=analysis${search}`, { as: 'analyst' })
  await screen.findByRole('region', { name: 'Validations' }, OPENING)
  await screen.findByRole('table', { name: 'Rows' }, OPENING)
  scroll.reset()
  return { ...view, scroll }
}

const heading = (name: string) => screen.getByRole('heading', { name })

/** The list is in view and has the focus, and the page did not go back to the top. */
async function expectListInFocus(scroll: ReturnType<typeof watchScroll>, name: string) {
  await waitFor(() => expect(document.activeElement).toBe(heading(name)))
  expect(scroll.scrolledIntoView(heading(name))).toBe(true)
  expect(scroll.wentToTop()).toBe(false)
}

/** batch-issues with sixty findings of Missing previous to batch: two pages of fifty. */
function manyMissingPrevious() {
  const fixture = batchIssuesFixture()
  const first = fixture.issues.find((i) => i.validationCode === 'missing_previous_to_batch')!
  const extra = Array.from({ length: 50 }, (_, i) => {
    const id = String(700_000_000_000_000 + i)
    return { ...first, transactionIdRaw: id, transactionId: id }
  })
  fixture.issues = [...fixture.issues, ...extra]
  return fixture
}

describe('in-page navigation in Analysis & Validations', () => {
  it('choosing a validation stays in place and takes the focus to its findings', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    const { user, scroll } = await openAnalysis(importId)

    await user.click(screen.getByRole('button', { name: 'Missing previous to batch' }))

    await expectListInFocus(scroll, FINDINGS)
  })

  it('Show unmatched rows stays in place and takes the focus to the rows', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    const { user, scroll } = await openAnalysis(importId)

    await user.click(screen.getByRole('link', { name: 'Show unmatched rows' }))

    await expectListInFocus(scroll, 'Rows')
  })

  it('the filter and the page of the rows stay in place and take the focus to the rows', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const { user, scroll } = await openAnalysis(importId)
    const toolbar = within(screen.getByRole('toolbar', { name: 'Show' }))

    await user.click(toolbar.getByRole('button', { name: 'Matched' }))
    await expectListInFocus(scroll, 'Rows')

    scroll.reset()
    const rows = within(screen.getByRole('table', { name: 'Rows' }).closest('section')!)
    await user.click(rows.getByRole('button', { name: 'Next' }))
    await expectListInFocus(scroll, 'Rows')
  })

  it('Next of the findings stays in place and takes the focus to the findings', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId, manyMissingPrevious())
    const { user, scroll } = await openAnalysis(importId, '&validation=missing_previous_to_batch')
    const findings = within(screen.getByRole('region', { name: FINDINGS }))
    await findings.findByText(/^Page 1 of 2/)
    scroll.reset()

    await user.click(findings.getByRole('button', { name: 'Next' }))

    await expectListInFocus(scroll, FINDINGS)
  })

  it('opening and closing a finding stays in place and gives the focus back to its ID', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    const { user, scroll } = await openAnalysis(importId, '&validation=missing_previous_to_batch')
    const findings = within(screen.getByRole('region', { name: FINDINGS }))
    const id = await findings.findByRole('button', { name: '292185165085382' })
    scroll.reset()

    await user.click(id)
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(document.activeElement).toBe(id))
    expect(scroll.wentToTop()).toBe(false)
  })

  it('arriving by a link with the validation and the filter shows both lists without taking the focus', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    await openAnalysis(importId, '&validation=missing_previous_to_batch&match=unmatched')

    expect(heading(FINDINGS)).toBeInTheDocument()
    expect(heading('Rows')).toBeInTheDocument()
    await within(screen.getByRole('region', { name: FINDINGS })).findByRole('button', { name: '292185165085382' })
    expect(focusOnAListHeading()).toBe(false)
  })

  it('the link to the blocking finding takes the focus to the findings of Provider mismatch', async () => {
    const { importId } = seedImport('batch-blocked', { status: 'analyzed' })
    seedValidationRun(importId, batchBlockedFixture())
    const { user, scroll } = await openAnalysis(importId)

    await user.click(screen.getByRole('button', { name: 'View the blocking finding' }))

    await expectListInFocus(scroll, 'Findings of Provider mismatch')
  })
})
