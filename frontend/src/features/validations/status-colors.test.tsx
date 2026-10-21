import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { seedImport } from '@/test/msw/imports'
import { batchBlockedFixture, batchIssuesFixture, seedValidationRun } from '@/test/msw/validations'
import { renderApp } from '@/test/render'
import { OPENING } from '@/test/validation-screens'

// Spec web-shell "Colores de estado": the tone of each Badge, always with its text (design D8).
async function openAnalysis(importId: string, search = '') {
  renderApp(`/imports/${importId}?step=analysis${search}`, { as: 'analyst' })
  await screen.findByRole('region', { name: 'Validations' }, OPENING)
}

/** The overall result, next to the title of the section. */
const overall = () => within(screen.getByRole('heading', { name: 'Validations' }).parentElement!)
const outcomeBadges = () =>
  within(screen.getByRole('table', { name: 'Validation results' }))
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[1]!.firstElementChild!)
const toneAndText = (badge: Element) => [badge.getAttribute('data-variant'), badge.textContent]

describe('status colours in Analysis & Validations', () => {
  it('batch-issues: Passed in green, each Warning and the overall Warnings in amber', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    await openAnalysis(importId)

    expect(overall().getByText('Warnings')).toHaveAttribute('data-variant', 'warning')
    expect(outcomeBadges().map(toneAndText)).toEqual([
      ['success', 'Passed'],
      ...Array.from({ length: 7 }, () => ['warning', 'Warning']),
    ])
  })

  it('batch-blocked: the overall Blocked and Provider mismatch Blocked in red', async () => {
    const { importId } = seedImport('batch-blocked', { status: 'analyzed' })
    seedValidationRun(importId, batchBlockedFixture())
    await openAnalysis(importId)

    expect(overall().getByText('Blocked')).toHaveAttribute('data-variant', 'danger')
    expect(toneAndText(outcomeBadges()[0]!)).toEqual(['danger', 'Blocked'])
  })

  it('n/a and Not implemented in grey', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const fixture = batchIssuesFixture()
    fixture.results[4] = { ...fixture.results[4]!, outcome: 'not_applicable', issueCount: 0, approved: false }
    fixture.results[5] = { ...fixture.results[5]!, outcome: 'not_implemented', issueCount: 0, approved: false }
    seedValidationRun(importId, fixture)
    await openAnalysis(importId)

    expect(toneAndText(outcomeBadges()[4]!)).toEqual(['neutral', 'n/a'])
    expect(toneAndText(outcomeBadges()[5]!)).toEqual(['neutral', 'Not implemented'])
  })

  it('an occurrence of a paid batch shows paid in green', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const { issues } = seedValidationRun(importId)
    const across = issues.find((i) => i.validationCode === 'duplicate_across_batches')!
    await openAnalysis(importId, `&issue=${across.issueId}`)

    const occurrences = within(
      within(await screen.findByRole('dialog', {}, OPENING)).getByRole('region', { name: 'Occurrences' }),
    )
    expect(occurrences.getByText('paid')).toHaveAttribute('data-variant', 'success')
  })
})
