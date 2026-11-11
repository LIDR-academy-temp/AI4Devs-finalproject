// Writes of the import workspace (design D3): every answer is the full detail, written into the cache instead of
// invalidating it (a GET re-reads the files on the server). The account's import list is invalidated for In Progress.
import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query'
import { validationRunKey } from '@/features/validations/queries'
import { api, unwrap } from '@/lib/api/client'
import type { ImportDetail, ImportRowItem, MappingConfirmationBody } from '@/lib/api/types'
import { asDetail, IMPORT_LIST_KEY, importKey } from './queries'

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

export interface ResolveRowInput {
  sheetId: string
  rowNo: number
  gatewayId: number
}

/**
 * Resolves an ambiguous row (web-ambiguous-rows design D3). The answer is the row, not the detail, so the detail, the
 * rows and the validations (the current run is superseded, README P7) are asked again instead of written.
 */
export function useResolveRow(importId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sheetId, rowNo, gatewayId }: ResolveRowInput) =>
      unwrap(
        api.PATCH('/api/v1/imports/{importId}/rows/{sheetId}/{rowNo}', {
          params: { path: { importId, sheetId, rowNo: String(rowNo) } },
          body: { gatewayId },
        }),
      ) as Promise<ImportRowItem>,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: importKey(importId), exact: true })
      void queryClient.invalidateQueries({ queryKey: [...importKey(importId), 'rows'] })
      void queryClient.invalidateQueries({ queryKey: validationRunKey(importId) })
    },
  })
}

export function useCancelImport(importId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reason: string) =>
      asDetail(api.POST('/api/v1/imports/{importId}/cancel', { params: { path: { importId } }, body: { reason } })),
    onSuccess: (detail) => {
      storeDetail(queryClient, detail)
      void queryClient.invalidateQueries({ queryKey: [...importKey(importId), 'rows'] })
    },
    // Cancelled or no longer cancellable, the import has left In Progress: its list is asked again either way (D6).
    onSettled: () => void queryClient.invalidateQueries({ queryKey: IMPORT_LIST_KEY }),
  })
}
