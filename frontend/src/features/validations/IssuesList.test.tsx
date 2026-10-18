import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { seedImport } from '@/test/msw/imports'
import { seedValidationRun, validationRequests } from '@/test/msw/validations'
import { renderApp } from '@/test/render'

async function openAnalysis(importId: string, search = '') {
  const view = renderApp(`/imports/${importId}?step=analysis${search}`, { as: 'analyst' })
  await screen.findByRole('table', { name: 'Validation results' })
  return view
}

const results = () => within(screen.getByRole('table', { name: 'Validation results' }))
const findingRows = async () =>
  within(await screen.findByRole('table', { name: 'Findings' }))
    .getAllByRole('row')
    .slice(1)

describe('Analysis & Validations: findings of a validation (spec "lista de hallazgos")', () => {
  it('missing previous to batch: asks the first page of 50 and lists the ten DEC findings', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    const { user } = await openAnalysis(importId)

    await user.click(results().getByRole('button', { name: 'Missing previous to batch' }))

    const rows = await findingRows()
    expect(rows).toHaveLength(10)
    expect(
      validationRequests('list').some((r) =>
        r.url.endsWith('/validation-issues?validationCode=missing_previous_to_batch&page=1&pageSize=50'),
      ),
    ).toBe(true)
    for (const row of rows) {
      expect(row).toHaveTextContent('DEC')
      expect(row).toHaveTextContent('Persistent')
    }
    expect(rows.some((row) => within(row).queryByText('292185165085382'))).toBe(true)
  })

  it('non-recorded adjustment: the adjustment and the two status mismatches with the reported and gateway status', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    const { user } = await openAnalysis(importId)

    await user.click(results().getByRole('button', { name: 'Non-recorded adjustment' }))

    const rows = await findingRows()
    expect(rows).toHaveLength(3)
    const row = (id: string) => within(rows.find((r) => within(r).queryByText(id))!)
    expect(row('281520820250015').getByText('Non-recorded adjustment')).toBeInTheDocument()
    expect(row('281520820250015').getByText('Chargeback')).toBeInTheDocument()
    expect(row('281520820250015').getByText('Successful')).toBeInTheDocument()
    expect(row('911545593909470').getByText('Status mismatch')).toBeInTheDocument()
    expect(row('911545593909470').getByText('Declined')).toBeInTheDocument()
    expect(row('911545593909470').getByText('Successful')).toBeInTheDocument()
    expect(row('381797111970492').getByText('Status mismatch')).toBeInTheDocument()
  })

  it('choosing another validation drops the page and the open finding from the address', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const { issues } = seedValidationRun(importId)
    const duplicate = issues.find((i) => i.validationCode === 'duplicate_in_batch')!
    const { user, router } = await openAnalysis(
      importId,
      `&validation=duplicate_in_batch&ipage=2&issue=${duplicate.issueId}`,
    )
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(results().getByRole('button', { name: 'Missing in range' }))

    await waitFor(() => expect(router.state.location.search).toMatchObject({ validation: 'missing_in_range' }))
    expect(router.state.location.search).not.toHaveProperty('ipage')
    expect(router.state.location.search).not.toHaveProperty('issue')
  })

  it('opening the address again shows the same validation and the same finding', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const { issues } = seedValidationRun(importId)
    const duplicate = issues.find((i) => i.validationCode === 'duplicate_in_batch')!

    await openAnalysis(importId, `&validation=duplicate_in_batch&issue=${duplicate.issueId}`)

    expect(results().getByRole('button', { name: 'Duplicate in batch' })).toHaveAttribute('aria-pressed', 'true')
    expect(await findingRows()).toHaveLength(1)
    expect(await screen.findByRole('dialog', { name: /441706751475644/ })).toBeInTheDocument()
  })
})
