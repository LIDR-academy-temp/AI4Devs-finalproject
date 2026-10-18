// Per-tab store of the uploads (design D4). It lives above the router, so no navigation stops it: files go one per
// request and in order; while there is no import, each one tries to create it and the first accepted does. The
// screens read it with useSyncExternalStore; signing out or expiring empties it and aborts what is in flight.
import { ApiError } from '@/lib/api/client'
import type { ImportDetail } from '@/lib/api/types'
import { strings } from '../strings'
import { checkSelection } from './file-checks'

export type EntryState = 'pending' | 'uploading' | 'rejected'

export interface QueueEntry {
  id: number
  fileName: string
  state: EntryState
  /** Why the file was rejected, in the words of the screen. */
  reason?: string
}

/** The uploads of one target: an account before its import exists, then that import. */
export interface Batch {
  accountId: string
  importId: string | null
  entries: QueueEntry[]
  /** A selection rejected as a whole (more than ten files). */
  selectionError?: string
}

export interface UploadTransport {
  create: (accountId: string, file: File, signal: AbortSignal) => Promise<ImportDetail>
  add: (importId: string, file: File, signal: AbortSignal) => Promise<ImportDetail>
  /** Every accepted file's answer: the detail of the import as it now stands. */
  onDetail: (detail: ImportDetail) => void
  /** The first accepted file created the import. */
  onCreated: (detail: ImportDetail) => void
}

const accountKey = (accountId: string) => `account:${accountId}`
const importKey = (importId: string) => `import:${importId}`

/** What the screen says about a rejection of the API or of the client checks. */
export function rejectionText(error: unknown): string {
  if (!(error instanceof ApiError)) return strings.rejections.failed
  const details = (error.details ?? {}) as { fileName?: string; fileId?: string | null; status?: string }
  switch (error.code) {
    case 'unsupported_file_type':
      return strings.rejections.unsupported_file_type
    case 'file_too_large':
      return strings.rejections.file_too_large
    case 'too_many_files':
      return strings.rejections.too_many_files
    case 'file_unreadable':
      return strings.rejections.file_unreadable
    case 'duplicate_file':
      return details.fileId && details.fileName
        ? strings.rejections.duplicate_file(details.fileName)
        : strings.rejections.duplicateInSelection
    case 'import_not_editable':
      return strings.rejections.notEditable(details.status ?? '')
    default:
      return strings.rejections.failed
  }
}

export class UploadQueue {
  private batches: Record<string, Batch> = {}
  private files = new Map<number, File>()
  private running = new Set<string>()
  private controllers = new Set<AbortController>()
  private listeners = new Set<() => void>()
  private seq = 0
  /** Bumped on clear(): a loop started before it stops at its next step. */
  private generation = 0

  constructor(private readonly transport: UploadTransport) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = () => this.batches

  /** Adds a selection for an account (no import yet) or for an existing import, and starts sending. */
  enqueue(target: { accountId: string; importId?: string | null }, files: readonly File[]) {
    const key = target.importId ? importKey(target.importId) : accountKey(target.accountId)
    const current = this.batches[key] ?? { accountId: target.accountId, importId: target.importId ?? null, entries: [] }
    // A new selection replaces the rejections of the previous one; pending and uploading entries stay.
    const kept = current.entries.filter((e) => e.state !== 'rejected')
    const check = checkSelection(files)
    if (check.tooMany) {
      this.update(key, { ...current, entries: kept, selectionError: strings.rejections.too_many_files })
      return
    }
    const entry = (file: File, state: EntryState, reason?: string): QueueEntry => {
      this.seq += 1
      if (state === 'pending') this.files.set(this.seq, file)
      return { id: this.seq, fileName: file.name, state, ...(reason ? { reason } : {}) }
    }
    const rejected = check.rejected.map(({ file, code }) => entry(file, 'rejected', strings.rejections[code]))
    const pending = check.accepted.map((file) => entry(file, 'pending'))
    this.update(key, { ...current, entries: [...kept, ...rejected, ...pending], selectionError: undefined })
    void this.run(key)
  }

  /** The batch of an import, or of an account while its import does not exist yet. */
  forImport(importId: string): Batch | undefined {
    return this.batches[importKey(importId)]
  }

  forAccount(accountId: string): Batch | undefined {
    return this.batches[accountKey(accountId)]
  }

  /** Empties the queue and aborts the requests in flight (sign out, expired session). */
  clear() {
    this.generation += 1
    for (const controller of this.controllers) controller.abort()
    this.controllers.clear()
    this.files.clear()
    this.running.clear()
    this.batches = {}
    this.emit()
  }

  private update(key: string, batch: Batch | undefined) {
    const batches = { ...this.batches }
    if (batch) batches[key] = batch
    else delete batches[key]
    this.batches = batches
    this.emit()
  }

  private setEntry(key: string, id: number, change: Partial<QueueEntry> | null) {
    const batch = this.batches[key]
    if (!batch) return
    const entries = change
      ? batch.entries.map((e) => (e.id === id ? { ...e, ...change } : e))
      : batch.entries.filter((e) => e.id !== id)
    this.update(key, { ...batch, entries })
  }

  private emit() {
    for (const listener of this.listeners) listener()
  }

  private async run(startKey: string) {
    if (this.running.has(startKey)) return
    const generation = this.generation
    let key = startKey
    this.running.add(key)
    try {
      for (;;) {
        if (generation !== this.generation) return
        const batch = this.batches[key]
        const next = batch?.entries.find((e) => e.state === 'pending')
        if (!batch || !next) return
        const file = this.files.get(next.id)!
        this.setEntry(key, next.id, { state: 'uploading' })
        const controller = new AbortController()
        this.controllers.add(controller)
        try {
          const detail = batch.importId
            ? await this.transport.add(batch.importId, file, controller.signal)
            : await this.transport.create(batch.accountId, file, controller.signal)
          if (generation !== this.generation) return
          this.files.delete(next.id)
          this.setEntry(key, next.id, null)
          if (!batch.importId) {
            // The first accepted file created the import: the rest of the selection goes to it.
            const moved = { ...this.batches[key]!, importId: detail.importId }
            this.update(key, undefined)
            this.running.delete(key)
            key = importKey(detail.importId)
            this.running.add(key)
            this.update(key, moved)
            this.transport.onDetail(detail)
            this.transport.onCreated(detail)
          } else {
            this.transport.onDetail(detail)
          }
        } catch (error) {
          if (generation !== this.generation) return
          this.files.delete(next.id)
          this.setEntry(key, next.id, { state: 'rejected', reason: rejectionText(error) })
        } finally {
          this.controllers.delete(controller)
        }
      }
    } finally {
      if (generation === this.generation) this.running.delete(key)
    }
  }
}
