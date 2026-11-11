// Cheap rejections before any request (design D4), with the same codes the API uses for them.
export const MAX_FILE_BYTES = 20 * 1024 * 1024
export const MAX_FILES_PER_SELECTION = 10

export type ClientRejection = 'unsupported_file_type' | 'file_too_large'

export type SelectionCheck =
  | { tooMany: true }
  | { tooMany: false; accepted: File[]; rejected: { file: File; code: ClientRejection }[] }

export function checkSelection(files: readonly File[]): SelectionCheck {
  if (files.length > MAX_FILES_PER_SELECTION) return { tooMany: true }
  const accepted: File[] = []
  const rejected: { file: File; code: ClientRejection }[] = []
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.xlsx')) rejected.push({ file, code: 'unsupported_file_type' })
    else if (file.size > MAX_FILE_BYTES) rejected.push({ file, code: 'file_too_large' })
    else accepted.push(file)
  }
  return { tooMany: false, accepted, rejected }
}
