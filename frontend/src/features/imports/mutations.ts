// Writes of the import workspace (design D3): every answer is the full detail, written into the cache instead of
// invalidating it (a GET re-reads the files on the server). The account's import list is invalidated for In Progress.
import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { ImportDetail, MappingConfirmationBody } from '@/lib/api/types'
import { asDetail, importKey } from './queries'

/** The contract types the multipart body as `{ files }`; it travels as the FormData itself (design D4). */
type MultipartBody = { files: string[] }

function filesForm(file: File): MultipartBody {
  const form = new FormData()
  form.append('files', file, file.name)
  return form as unknown as MultipartBody
}

const identity = (body: unknown) => body as BodyInit

export function createImport(accountId: string, file: File, signal: AbortSignal) {
  return asDetail(
    api.POST('/api/v1/accounts/{accountId}/imports', {
      params: { path: { accountId } },
      body: filesForm(file),
      bodySerializer: identity,
      signal,
    }),
  )
}

export function addImportFile(importId: string, file: File, signal: AbortSignal) {
  return asDetail(
    api.POST('/api/v1/imports/{importId}/files', {
      params: { path: { importId } },
      body: filesForm(file),
      bodySerializer: identity,
      signal,
    }),
  )
}

/** Writes an answer of the API into the cache: the detail of the import as it now stands. */
export function storeDetail(queryClient: QueryClient, detail: ImportDetail) {
  queryClient.setQueryData(importKey(detail.importId), detail)
  void queryClient.invalidateQueries({ queryKey: ['accounts', detail.accountId, 'imports'] })
}

export function useRemoveFile(importId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fileId: string) =>
      asDetail(api.DELETE('/api/v1/imports/{importId}/files/{fileId}', { params: { path: { importId, fileId } } })),
    onSuccess: (detail) => storeDetail(queryClient, detail),
  })
}

export function useConfirmMapping(importId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: MappingConfirmationBody) =>
      asDetail(api.PUT('/api/v1/imports/{importId}/mapping', { params: { path: { importId } }, body })),
    onSuccess: (detail) => storeDetail(queryClient, detail),
  })
}

/** After a 409 of a transition the screen reloads the import as it stands (design D3). */
export function useReloadImport(importId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: importKey(importId), exact: true })
}
