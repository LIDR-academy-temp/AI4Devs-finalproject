// multipart/form-data → staged uploads (design D3, D9). Every part is consumed so that the request
// completes cleanly; a rejected part fails the whole request after the others have been drained,
// and nothing staged survives a failure.
import type { FastifyRequest } from 'fastify'
import type { FileStore, StagedUpload } from '../application/ports.js'
import {
  FileTooLargeError,
  MultipartExpectedError,
  NoFilesError,
  TooManyFilesError,
  UnsupportedFileTypeError,
} from '../domain/errors.js'
import { assertXlsxName, MAX_FILE_BYTES, MAX_FILES_PER_REQUEST, sanitizeFileName } from '../domain/upload-policy.js'

/** Error codes of @fastify/multipart that we answer with our own 400s. */
const LIMIT_CODES = new Set(['FST_FILES_LIMIT', 'FST_PARTS_LIMIT', 'FST_FIELDS_LIMIT'])
const NOT_MULTIPART_CODE = 'FST_INVALID_MULTIPART_CONTENT_TYPE'

function translate(error: unknown): unknown {
  const code = (error as { code?: string } | null)?.code
  if (code === NOT_MULTIPART_CODE) return new MultipartExpectedError()
  if (code !== undefined && LIMIT_CODES.has(code)) return new TooManyFilesError(MAX_FILES_PER_REQUEST)
  return error
}

async function drain(stream: AsyncIterable<unknown>): Promise<void> {
  for await (const _chunk of stream) {
    // discard
  }
}

/**
 * Reads every `files` part of the request into the temporary area, hashing and measuring it on the way.
 * Throws the first problem found (type, size, count, not multipart, no files) after cleaning up.
 */
export async function collectUploads(request: FastifyRequest, store: FileStore): Promise<StagedUpload[]> {
  const staged: StagedUpload[] = []
  let failure: unknown

  try {
    for await (const part of request.files()) {
      if (failure !== undefined) {
        await drain(part.file)
        continue
      }
      const fileName = sanitizeFileName(part.filename)
      try {
        assertXlsxName(fileName)
      } catch (error) {
        failure = error instanceof UnsupportedFileTypeError ? error : new UnsupportedFileTypeError(fileName)
        await drain(part.file)
        continue
      }
      const file = await store.stage(part.file)
      // @fastify/multipart truncates a part at `limits.fileSize` instead of throwing (throwFileSizeLimit: false).
      if (part.file.truncated) {
        await store.discard(file.tempPath)
        failure = new FileTooLargeError(fileName, `${MAX_FILE_BYTES} bytes per file`)
        continue
      }
      staged.push({ fileName, ...file })
    }
  } catch (error) {
    failure ??= translate(error)
  }

  if (failure !== undefined) {
    for (const upload of staged) await store.discard(upload.tempPath)
    throw failure
  }
  if (staged.length === 0) throw new NoFilesError()
  return staged
}
