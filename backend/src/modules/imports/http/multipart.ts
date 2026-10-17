// multipart/form-data → staged uploads (design D3, D9). Every part is consumed so that the request
// completes cleanly; a rejected part fails the whole request after the others have been drained,
// and nothing staged survives a failure.
import type { MultipartFile } from '@fastify/multipart'
import type { FastifyRequest } from 'fastify'
import { DomainError } from '../../../shared/errors.js'
import type { FileStore, StagedFile, StagedUpload } from '../application/ports.js'
import {
  FileTooLargeError,
  MalformedMultipartError,
  MultipartExpectedError,
  NoFilesError,
  TooManyFilesError,
} from '../domain/errors.js'
import { assertXlsxName, MAX_FILE_BYTES, MAX_FILES_PER_REQUEST, sanitizeFileName } from '../domain/upload-policy.js'

/** Error codes of @fastify/multipart that we answer with our own 400s. */
const LIMIT_CODES = new Set(['FST_FILES_LIMIT', 'FST_PARTS_LIMIT', 'FST_FIELDS_LIMIT'])
const NOT_MULTIPART_CODE = 'FST_INVALID_MULTIPART_CONTENT_TYPE'

/**
 * An error raised by the parser while producing the next part. Our own errors and the ones that already
 * carry an HTTP status pass through; anything else (a body cut before the closing boundary, a broken
 * header) is the client's malformed body, never a 500.
 */
function translate(error: unknown): unknown {
  if (error instanceof DomainError) return error
  const { code, statusCode } = (error ?? {}) as { code?: string; statusCode?: number }
  if (code === NOT_MULTIPART_CODE) return new MultipartExpectedError()
  if (code !== undefined && LIMIT_CODES.has(code)) return new TooManyFilesError(MAX_FILES_PER_REQUEST)
  if (typeof statusCode === 'number') return error
  return new MalformedMultipartError()
}

/** Best effort: the part is being discarded, so a stream that the parser already cut is not an error here. */
async function drain(stream: AsyncIterable<unknown>): Promise<void> {
  try {
    for await (const _chunk of stream) {
      // discard
    }
  } catch {
    // ignored
  }
}

/**
 * Reads every `files` part of the request into the temporary area, hashing and measuring it on the way.
 * Throws the first problem found (type, size, count, not multipart, malformed body, no files) after cleaning up.
 */
export async function collectUploads(request: FastifyRequest, store: FileStore): Promise<StagedUpload[]> {
  const staged: StagedUpload[] = []
  /** The error to answer with. */
  let failure: unknown
  /** A staging error, judged once the parser has had its say (see below). */
  let storageFailure: unknown

  async function handlePart(part: MultipartFile): Promise<void> {
    if (failure !== undefined || storageFailure !== undefined) return drain(part.file)
    // A binary part may come without filename (@fastify/busboy treats application/octet-stream as a file).
    const fileName = sanitizeFileName(part.filename ?? '')
    try {
      assertXlsxName(fileName)
    } catch (error) {
      failure = error
      return drain(part.file)
    }
    let file: StagedFile
    try {
      file = await store.stage(part.file)
    } catch (error) {
      // Either the parser cut the part short (the body ends early) or the write failed: the parser decides.
      storageFailure = error
      return
    }
    // @fastify/multipart truncates a part at `limits.fileSize` instead of throwing (throwFileSizeLimit: false).
    if (part.file.truncated) {
      await store.discard(file.tempPath)
      failure = new FileTooLargeError(fileName, `${MAX_FILE_BYTES} bytes per file`)
      return
    }
    staged.push({ fileName, ...file })
  }

  // True while the parser is producing the next part; false while our own code handles one, so that a
  // storage failure is never mistaken for a malformed body.
  let awaitingPart = true
  try {
    for await (const part of request.files()) {
      awaitingPart = false
      await handlePart(part)
      awaitingPart = true
    }
  } catch (error) {
    failure ??= awaitingPart ? translate(error) : error
  }
  // A staging error under a healthy parser is a storage failure (500); under a failing parser it is only a
  // consequence of the malformed body, already answered as 400.
  failure ??= storageFailure

  if (failure !== undefined) {
    for (const upload of staged) await store.discard(upload.tempPath)
    throw failure
  }
  if (staged.length === 0) throw new NoFilesError()
  return staged
}
