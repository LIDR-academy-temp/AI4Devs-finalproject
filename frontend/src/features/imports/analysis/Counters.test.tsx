import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { UserName } from '@/test/msw/fixtures'
import { importRecord, seedImport } from '@/test/msw/imports'
import { renderApp } from '@/test/render'

/** The text of Settlement Review, copied on purpose (design D2): a change to either copy breaks this test. */
const WRONG_ACCOUNT = 'The IDs do not fit any gateway of this account: the files may belong to another account.'

async function openAnalysis(importId: string, as: UserName = 'analyst') {
  renderApp(`/imports/${importId}?step=analysis`, { as })
  await screen.findByRole('region', { name: 'Rows read' })
}

const unmatched = () => screen.getByRole('region', { name: 'Unmatched' })
const byReason = () => within(unmatched()).queryByRole('list', { name: 'Unmatched by reason' })
const wrongAccount = () => screen.queryByRole('region', { name: 'Wrong account?' })

describe('Analysis: unmatched rows by reason (spec "Resultado del análisis: filas sin asociar por motivo")', () => {
  it('a file of another account: only "ID does not fit any gateway", with the number of the counter', async () => {
    // batch-wrong-account stand-in: every row unmatched by id_format (the 12 of expected.json is checked on the
    // real API, in the screenshots; design D6).
    await openAnalysis(seedImport('batch-clean', { status: 'analyzed', unmatched: 'id_format' }).importId)

    const total = within(unmatched()).getAllByText(/^\d+$/)[0]!.textContent
    const items = within(byReason()!).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(items[0]).toHaveTextContent(`ID does not fit any gateway${total}`)
  })

  it('batch-issues: only "No match" with 1', async () => {
    await openAnalysis(seedImport('batch-issues', { status: 'analyzed' }).importId)

    const items = within(byReason()!).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(items[0]).toHaveTextContent('No match1')
  })

  it('several reasons: no_match before id_format, without the reasons at 0', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed', unmatched: 'no_match' })
    const record = importRecord(importId)
    const first = record.rows!.findIndex((r) => r.matchResult === 'unmatched')
    record.rows = record.rows!.map((r, i) => (i === first ? { ...r, reason: 'id_format' } : r))
    await openAnalysis(importId)

    const items = within(byReason()!).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent(/^No match\d+$/)
    expect(items[1]).toHaveTextContent('ID does not fit any gateway1')
  })

  it('batch-clean: Unmatched 0 and no breakdown', async () => {
    await openAnalysis(seedImport('batch-clean', { status: 'analyzed' }).importId)

    expect(unmatched()).toHaveTextContent('Unmatched0')
    expect(byReason()).not.toBeInTheDocument()
  })
})

describe('Analysis: wrong account notice (spec "Resultado del análisis: aviso de cuenta equivocada")', () => {
  it('a file of another account: analyst sees the notice with the text of Settlement Review', async () => {
    await openAnalysis(seedImport('batch-clean', { status: 'analyzed', unmatched: 'id_format' }).importId)

    expect(wrongAccount()).toHaveTextContent(WRONG_ACCOUNT)
  })

  it('viewer sees the same notice, without the decision bar', async () => {
    await openAnalysis(seedImport('batch-clean', { status: 'analyzed', unmatched: 'id_format' }).importId, 'viewer')

    expect(wrongAccount()).toHaveTextContent(WRONG_ACCOUNT)
  })

  it('a cancelled import keeps the notice', async () => {
    await openAnalysis(seedImport('batch-clean', { status: 'cancelled', unmatched: 'id_format' }).importId)

    expect(wrongAccount()).toHaveTextContent(WRONG_ACCOUNT)
  })

  it('does not appear when the rows are unmatched for other reasons too', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed', unmatched: 'no_match' })
    const record = importRecord(importId)
    const first = record.rows!.findIndex((r) => r.matchResult === 'unmatched')
    record.rows = record.rows!.map((r, i) => (i === first ? { ...r, reason: 'id_format' } : r))
    await openAnalysis(importId)

    expect(wrongAccount()).not.toBeInTheDocument()
  })

  it('does not appear on batch-clean', async () => {
    await openAnalysis(seedImport('batch-clean', { status: 'analyzed' }).importId)

    expect(wrongAccount()).not.toBeInTheDocument()
  })
})
