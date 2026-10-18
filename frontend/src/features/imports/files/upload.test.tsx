import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  dropFiles,
  dropZone,
  fileEntry,
  fileInput,
  findFileEntry,
  importIdAfterUpload,
  NEW_IN_PROVIDER_A_USD,
} from '@/test/import-screens'
import { db } from '@/test/msw/handlers'
import { holdNext, importRecord, importRequests, sampleFile, seedImport } from '@/test/msw/imports'
import { renderApp } from '@/test/render'
import { strings } from '../strings'

const MiB20 = 20 * 1024 * 1024
const PART1 = 'Recon_Template_ProviderA-USD_batch-split_part1.xlsx'
const PART2 = 'Recon_Template_ProviderA-USD_batch-split_part2.xlsx'
const CLEAN = 'Recon_Template_ProviderA-USD_batch-clean.xlsx'

const sheetLine = (name: string, rows: number) => strings.files.sheet(name, rows)

describe('upload transport (design D4)', () => {
  it('sends multipart/form-data with a files part carrying the file name', async () => {
    const { user, router } = renderApp(NEW_IN_PROVIDER_A_USD, { as: 'analyst' })

    await waitFor(() => expect(dropZone()).toBeEnabled())
    await user.upload(fileInput(), sampleFile('batch-clean'))
    await importIdAfterUpload(router)

    const [create] = importRequests('create')
    expect(create?.contentType).toMatch(/^multipart\/form-data; boundary=/)
    expect(create?.parts).toEqual([{ name: CLEAN, size: 'batch-clean'.length }])
  })

  it('repeats the upload with the same parts after a 401 with an expired access token', async () => {
    const { user, router } = renderApp(NEW_IN_PROVIDER_A_USD, { as: 'analyst' })
    await waitFor(() => expect(dropZone()).toBeEnabled())
    db.accessTokens.clear()

    await user.upload(fileInput(), sampleFile('batch-clean'))
    await importIdAfterUpload(router)

    const creates = importRequests('create')
    expect(creates.map((r) => r.status)).toEqual([401, 201])
    expect(creates[1]?.parts).toEqual(creates[0]?.parts)
    expect(creates[1]?.parts).toEqual([{ name: CLEAN, size: 'batch-clean'.length }])
  })
})

describe('Upload Files: uploading (spec "Pantalla Upload Files: subida de archivos")', () => {
  it('a batch split in two files gives one import in the Files step with the sheets of each file', async () => {
    const { user, router } = renderApp(NEW_IN_PROVIDER_A_USD, { as: 'analyst' })
    await waitFor(() => expect(dropZone()).toBeEnabled())

    await user.upload(fileInput(), [sampleFile('batch-split_part1'), sampleFile('batch-split_part2')])
    const importId = await importIdAfterUpload(router)

    expect(router.state.location.search).toMatchObject({ step: 'files' })
    const part2 = await findFileEntry(PART2)
    for (const [sheet, rows] of [
      ['CHB', 3],
      ['REF', 7],
      ['RDR', 3],
      ['RR', 320],
      ['Other Fees', 2],
    ] as const) {
      expect(part2.getByText(sheetLine(sheet, rows))).toBeInTheDocument()
    }
    const part1 = fileEntry(PART1)
    expect(part1.getByText(sheetLine('APP', 340))).toBeInTheDocument()
    expect(part1.getByText(sheetLine('DEC', 110))).toBeInTheDocument()
    expect(importRequests('create')).toHaveLength(1)
    expect(importRecord(importId).files).toHaveLength(2)
    expect(importRecord(importId).status).toBe('uploaded')
  })

  it('the template in one file shows ten sheets with their rows and Settings as hidden', async () => {
    const { user, router } = renderApp(NEW_IN_PROVIDER_A_USD, { as: 'analyst' })
    await waitFor(() => expect(dropZone()).toBeEnabled())

    await user.upload(fileInput(), sampleFile('batch-clean'))
    await importIdAfterUpload(router)

    const clean = await findFileEntry(CLEAN)
    for (const [sheet, rows] of [
      ['APP', 340],
      ['DEC', 110],
      ['CHB', 3],
      ['REF', 7],
      ['RDR', 3],
      ['RR', 320],
      ['Duplicate Corrections', 0],
      ['CHB Alerts', 0],
      ['Other Fees', 2],
    ] as const) {
      expect(clean.getByText(sheetLine(sheet, rows))).toBeInTheDocument()
    }
    expect(clean.getByText(sheetLine('Settings', 21)).closest('li')).toHaveTextContent(strings.files.hidden)
  })

  it('adding part2 from the Files step keeps the same import', async () => {
    const { importId } = seedImport('batch-split', { labels: ['batch-split_part1'] })
    const { user, router } = renderApp(`/imports/${importId}?step=files`, { as: 'analyst' })

    await findFileEntry(PART1)
    await user.upload(fileInput(), sampleFile('batch-split_part2'))

    await findFileEntry(PART2)
    expect(fileEntry(PART1).getByText(sheetLine('APP', 340))).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/imports/${importId}`)
    expect(importRequests('create')).toHaveLength(0)
    expect(importRequests('addFiles')).toHaveLength(1)
  })

  it('shows Uploading… and does not accept another selection until the upload ends', async () => {
    const hold = holdNext('create')
    const { user, router } = renderApp(NEW_IN_PROVIDER_A_USD, { as: 'analyst' })
    await waitFor(() => expect(dropZone()).toBeEnabled())

    await user.upload(fileInput(), sampleFile('batch-clean'))
    await hold.arrived

    expect(fileEntry(CLEAN).getByText(strings.files.uploading)).toBeInTheDocument()
    expect(dropZone()).toBeDisabled()
    hold.release()
    await importIdAfterUpload(router)
    await waitFor(() => expect(dropZone()).toBeEnabled())
  })

  it('a drop with dataTransfer.files does what the file chooser does', async () => {
    const { router } = renderApp(NEW_IN_PROVIDER_A_USD, { as: 'analyst' })
    await waitFor(() => expect(dropZone()).toBeEnabled())

    dropFiles([sampleFile('batch-clean')])

    await importIdAfterUpload(router)
    expect(await findFileEntry(CLEAN)).toBeTruthy()
    expect(importRequests('create')).toHaveLength(1)
  })
})

describe('Upload Files: rejected files (spec "Pantalla Upload Files: archivos rechazados")', () => {
  it('rejects batch.csv without any request', async () => {
    renderApp(NEW_IN_PROVIDER_A_USD, { as: 'analyst' })
    await waitFor(() => expect(dropZone()).toBeEnabled())

    dropFiles([sampleFile('batch-clean', 'batch.csv')])

    expect((await findFileEntry('batch.csv')).getByText('Only .xlsx files are accepted.')).toBeInTheDocument()
    expect(importRequests()).toEqual([])
  })

  it('rejects 20 971 521 bytes without any request and sends exactly 20 971 520', async () => {
    const { user, router } = renderApp(NEW_IN_PROVIDER_A_USD, { as: 'analyst' })
    await waitFor(() => expect(dropZone()).toBeEnabled())

    await user.upload(fileInput(), sampleFile('batch-clean', 'big.xlsx', MiB20 + 1))
    expect((await findFileEntry('big.xlsx')).getByText('The file exceeds the 20 MB limit.')).toBeInTheDocument()
    expect(importRequests()).toEqual([])

    await user.upload(fileInput(), sampleFile('batch-clean', 'exact.xlsx', MiB20))
    await importIdAfterUpload(router)
    expect(importRequests('create').map((r) => r.parts)).toEqual([[{ name: 'exact.xlsx', size: MiB20 }]])
  })

  it('rejects a selection of eleven files without sending any', async () => {
    const { user } = renderApp(NEW_IN_PROVIDER_A_USD, { as: 'analyst' })
    await waitFor(() => expect(dropZone()).toBeEnabled())

    await user.upload(
      fileInput(),
      Array.from({ length: 11 }, (_, i) => sampleFile(`generic-${i + 1}`)),
    )

    expect(await screen.findByText('Select at most 10 files at a time.')).toBeInTheDocument()
    expect(importRequests()).toEqual([])
  })

  it('shows an unreadable workbook with its reason and keeps uploading the rest of the selection', async () => {
    const { importId } = seedImport('batch-split', { labels: ['batch-split_part1'] })
    const { user } = renderApp(`/imports/${importId}?step=files`, { as: 'analyst' })
    await findFileEntry(PART1)

    await user.upload(fileInput(), [sampleFile('broken', 'batch.xlsx'), sampleFile('batch-split_part2')])

    expect(
      (await findFileEntry('batch.xlsx')).getByText('The file cannot be read as an Excel workbook.'),
    ).toBeInTheDocument()
    await findFileEntry(PART2)
    expect(importRecord(importId).files.map((f) => f.fileName)).toEqual([PART1, PART2])
  })

  it('names the file already included when the same content comes with another name', async () => {
    const { importId } = seedImport('batch-split')
    const { user } = renderApp(`/imports/${importId}?step=files`, { as: 'analyst' })
    await findFileEntry(PART2)

    await user.upload(fileInput(), sampleFile('batch-split_part1', 'part1-again.xlsx'))

    expect(
      (await findFileEntry('part1-again.xlsx')).getByText(
        'This file is already in the import as Recon_Template_ProviderA-USD_batch-split_part1.xlsx.',
      ),
    ).toBeInTheDocument()
    expect(importRecord(importId).files).toHaveLength(2)
    expect(fileEntry(PART1).getByText(sheetLine('APP', 340))).toBeInTheDocument()
  })
})

describe('Upload Files: removing files (spec "Pantalla Upload Files: quitar archivos")', () => {
  it('Remove on part2 leaves part1 alone, takes part2 out of Mapping and shows the readiness of the answer', async () => {
    const { importId } = seedImport('batch-split')
    const { user } = renderApp(`/imports/${importId}?step=files`, { as: 'analyst' })

    await user.click((await findFileEntry(PART2)).getByRole('button', { name: strings.files.remove(PART2) }))

    await waitFor(() => expect(screen.queryByRole('listitem', { name: PART2 })).not.toBeInTheDocument())
    expect(fileEntry(PART1).getByText(sheetLine('APP', 340))).toBeInTheDocument()
    expect(importRequests('removeFile')).toHaveLength(1)

    await user.click(screen.getByRole('tab', { name: strings.steps.mapping }))
    expect(await screen.findByRole('region', { name: PART1 })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: PART2 })).not.toBeInTheDocument()
    const readiness = within(screen.getByRole('status', { name: strings.readiness.label }))
    expect(readiness.getByText(strings.readiness.ready)).toBeInTheDocument()
  })

  it('removing the only file leaves an empty import with the drop zone and Analyze disabled', async () => {
    const { importId } = seedImport('batch-clean')
    const { user } = renderApp(`/imports/${importId}?step=files`, { as: 'analyst' })

    await user.click((await findFileEntry(CLEAN)).getByRole('button', { name: strings.files.remove(CLEAN) }))

    await waitFor(() => expect(screen.queryByRole('listitem', { name: CLEAN })).not.toBeInTheDocument())
    expect(dropZone()).toBeEnabled()
    await user.click(screen.getByRole('tab', { name: strings.steps.mapping }))
    expect(await screen.findByRole('button', { name: strings.analyze.button })).toBeDisabled()
  })
})

describe('Upload Files: continuing (spec "Continuar al pareo")', () => {
  const continueButton = () => screen.queryByRole('button', { name: 'Continue to mapping' })

  it('Continue to mapping takes an import with files to the Mapping step', async () => {
    const { importId } = seedImport('batch-clean')
    const { user, router } = renderApp(`/imports/${importId}?step=files`, { as: 'analyst' })
    await findFileEntry(CLEAN)

    await user.click(continueButton()!)

    await waitFor(() => expect(router.state.location.search).toMatchObject({ step: 'mapping' }))
    expect(screen.getByRole('tab', { name: strings.steps.mapping })).toHaveAttribute('aria-selected', 'true')
  })

  it('is not offered without files nor to viewer', async () => {
    const empty = seedImport('batch-clean', { labels: [] }).importId
    const { unmount } = renderApp(`/imports/${empty}?step=files`, { as: 'analyst' })
    await screen.findByText(strings.files.empty)
    expect(continueButton()).not.toBeInTheDocument()
    unmount()

    renderApp(`/imports/${seedImport('batch-clean').importId}?step=files`, { as: 'viewer' })
    await findFileEntry(CLEAN)
    expect(continueButton()).not.toBeInTheDocument()
  })
})
