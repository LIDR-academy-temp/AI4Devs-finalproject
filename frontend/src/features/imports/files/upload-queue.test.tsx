// The upload queue lives above the router (design D4): it survives navigation and empties on sign out.
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { strings as layoutStrings } from '@/app/layout/strings'
import { strings as loginStrings } from '@/features/auth/strings'
import { dropZone, fileInput, findFileEntry, importIdAfterUpload, NEW_IN_PROVIDER_A_USD } from '@/test/import-screens'
import { PASSWORD } from '@/test/msw/fixtures'
import { holdNext, importRecord, importRequests, sampleFile } from '@/test/msw/imports'
import { renderApp } from '@/test/render'
import { strings } from '../strings'

const TEN = Array.from({ length: 10 }, (_, i) => `generic-${i + 1}`)
const nameOf = (label: string) => `Recon_Template_ProviderA-USD_${label}.xlsx`

async function expectTenFilesShown() {
  for (const label of TEN) await findFileEntry(nameOf(label))
  expect(screen.queryByText(strings.files.uploading)).not.toBeInTheDocument()
}

describe('upload queue (spec "Diez archivos con navegación a mitad", "Primer archivo ilegible")', () => {
  it('ten files: the first creates the import, the app moves to it and the other nine are added there', async () => {
    const { user, router } = renderApp(NEW_IN_PROVIDER_A_USD, { as: 'analyst' })
    await waitFor(() => expect(dropZone()).toBeEnabled())

    await user.upload(
      fileInput(),
      TEN.map((label) => sampleFile(label)),
    )
    const importId = await importIdAfterUpload(router)

    await expectTenFilesShown()
    expect(importRequests('create')).toHaveLength(1)
    expect(importRequests('addFiles')).toHaveLength(9)
    expect(importRecord(importId).files).toHaveLength(10)
  })

  it('ten files: opening Dashboard in the middle does not stop them, and the import shows the ten on return', async () => {
    const hold = holdNext('addFiles')
    const { user, router } = renderApp(NEW_IN_PROVIDER_A_USD, { as: 'analyst' })
    await waitFor(() => expect(dropZone()).toBeEnabled())

    await user.upload(
      fileInput(),
      TEN.map((label) => sampleFile(label)),
    )
    const importId = await importIdAfterUpload(router)
    await hold.arrived
    const nav = within(screen.getByRole('navigation', { name: layoutStrings.mainNav }))
    await user.click(nav.getByRole('link', { name: layoutStrings.screens.dashboard }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    hold.release()

    await waitFor(() => expect(importRequests('addFiles').filter((r) => r.status === 200)).toHaveLength(9))
    await router.navigate({ to: '/imports/$importId', params: { importId }, search: { step: 'files' } })
    await expectTenFilesShown()
    expect(importRequests('create')).toHaveLength(1)
  })

  it('an unreadable first file is rejected and the next one creates the import', async () => {
    const { user, router } = renderApp(NEW_IN_PROVIDER_A_USD, { as: 'analyst' })
    await waitFor(() => expect(dropZone()).toBeEnabled())

    await user.upload(fileInput(), [sampleFile('broken'), sampleFile('batch-clean')])
    const importId = await importIdAfterUpload(router)

    expect(
      (await findFileEntry('broken.xlsx')).getByText('The file cannot be read as an Excel workbook.'),
    ).toBeInTheDocument()
    await findFileEntry(nameOf('batch-clean'))
    expect(importRequests('create').map((r) => r.status)).toEqual([422, 201])
    expect(importRequests('addFiles')).toHaveLength(0)
    expect(importRecord(importId).files.map((f) => f.fileName)).toEqual([nameOf('batch-clean')])
  })

  it('signing out in the middle sends no further upload and the queue is empty after signing in again', async () => {
    const hold = holdNext('addFiles')
    const { user, router } = renderApp(NEW_IN_PROVIDER_A_USD, { as: 'analyst' })
    await waitFor(() => expect(dropZone()).toBeEnabled())

    await user.upload(
      fileInput(),
      TEN.map((label) => sampleFile(label)),
    )
    const importId = await importIdAfterUpload(router)
    await hold.arrived
    await user.click(screen.getByRole('button', { name: layoutStrings.signOut }))
    await screen.findByRole('button', { name: loginStrings.submit })
    hold.release()

    await user.type(screen.getByLabelText(loginStrings.userName), 'analyst')
    await user.type(screen.getByLabelText(loginStrings.password), PASSWORD)
    await user.click(screen.getByRole('button', { name: loginStrings.submit }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    await router.navigate({ to: '/imports/$importId', params: { importId }, search: { step: 'files' } })

    await findFileEntry(nameOf('generic-1'))
    expect(importRequests('addFiles')).toHaveLength(1)
    expect(screen.queryByText(strings.files.uploading)).not.toBeInTheDocument()
    expect(screen.queryByText(strings.files.pending)).not.toBeInTheDocument()
  })
})
