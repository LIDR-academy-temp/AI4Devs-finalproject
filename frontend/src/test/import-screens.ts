// Helpers of the import screen tests: where to start, how to give files and where to find them.
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { expect } from 'vitest'
import type { AppRouter } from '@/app/router'
import { strings } from '@/features/imports/strings'
import { ACCOUNT_IDS } from './msw/fixtures'

/** New Reconciliation with ProviderA-USD chosen. */
export const NEW_IN_PROVIDER_A_USD = `/reconciliations/new?merchantId=1&providerId=101&accountId=${ACCOUNT_IDS['ProviderA-USD']}`

export const dropZone = () => screen.getByRole('button', { name: strings.upload.dropZone })

/** The hidden file input behind the drop zone (what the keyboard-reachable button opens). */
export const fileInput = () => screen.getByTestId('file-input') as HTMLInputElement

/** Drops files on the zone, as dragging them from the desktop does. */
export function dropFiles(files: File[]) {
  fireEvent.drop(dropZone(), { dataTransfer: { files, types: ['Files'] } })
}

/** The entry of a file in the list (an included file or one pending, uploading or rejected). */
export const fileEntry = (fileName: string) => within(screen.getByRole('listitem', { name: fileName }))

export const findFileEntry = async (fileName: string) => within(await screen.findByRole('listitem', { name: fileName }))

/** Waits for the workspace of the import created from New Reconciliation and returns its id. */
export async function importIdAfterUpload(router: AppRouter): Promise<string> {
  await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/imports\/[0-9a-f-]{36}$/))
  return router.state.location.pathname.split('/').at(-1)!
}
