// The upload root on disk (design D4, D6, D12): staged parts under tmp/, accepted files under
// imports/<importId>/<fileId>.xlsx. Every path is relative to the root and checked to stay inside it.
import { createHash, randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, readFile, rename, unlink } from 'node:fs/promises'
import path from 'node:path'
import { type Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { FileStore, StagedFile } from '../application/ports.js'

const IMPORTS_DIR = 'imports'
const TMP_DIR = 'tmp'

export class FsFileStore implements FileStore {
  private constructor(private readonly root: string) {}

  /** Resolves the root (relative to the process cwd) and makes sure imports/ and tmp/ exist. */
  static async create(root: string): Promise<FsFileStore> {
    const absolute = path.resolve(root)
    await mkdir(path.join(absolute, IMPORTS_DIR), { recursive: true })
    await mkdir(path.join(absolute, TMP_DIR), { recursive: true })
    return new FsFileStore(absolute)
  }

  get rootPath(): string {
    return this.root
  }

  async stage(stream: Readable): Promise<StagedFile> {
    const tempPath = `${TMP_DIR}/${randomUUID()}.part`
    const hash = createHash('sha256')
    let sizeBytes = 0
    const tap = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        hash.update(chunk)
        sizeBytes += chunk.length
        callback(null, chunk)
      },
    })
    const absolute = this.resolveInside(tempPath)
    try {
      await pipeline(stream, tap, createWriteStream(absolute))
    } catch (error) {
      await unlink(absolute).catch(() => undefined)
      throw error
    }
    return { tempPath, sizeBytes, sha256: hash.digest('hex') }
  }

  async commit(tempPath: string, storagePath: string): Promise<void> {
    const from = this.resolveInside(tempPath)
    const to = this.resolveInside(storagePath)
    await mkdir(path.dirname(to), { recursive: true })
    await rename(from, to)
  }

  async discard(tempPath: string): Promise<void> {
    await this.unlinkIfPresent(this.resolveInside(tempPath))
  }

  async remove(storagePath: string): Promise<void> {
    await this.unlinkIfPresent(this.resolveInside(storagePath))
  }

  async read(relativePath: string): Promise<Uint8Array> {
    return readFile(this.resolveInside(relativePath))
  }

  private async unlinkIfPresent(absolute: string): Promise<void> {
    try {
      await unlink(absolute)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }

  /** Backslashes are normalised first so that the check behaves the same on every platform. */
  private resolveInside(relative: string): string {
    const resolved = path.resolve(this.root, relative.replace(/\\/g, '/'))
    if (resolved !== this.root && !resolved.startsWith(this.root + path.sep)) {
      throw new Error(`path ${relative} is outside the upload root`)
    }
    return resolved
  }
}
