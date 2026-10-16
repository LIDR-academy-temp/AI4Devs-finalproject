import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FsFileStore } from './fs-file-store.js'

let root: string
let store: FsFileStore

const BYTES = Buffer.from('PK\u0003\u0004 not really a workbook, but bytes are bytes')
const SHA256 = createHash('sha256').update(BYTES).digest('hex')

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'recon-uploads-'))
  store = await FsFileStore.create(root)
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('FsFileStore', () => {
  it('creates the imports/ and tmp/ directories under the root', async () => {
    expect((await stat(path.join(root, 'imports'))).isDirectory()).toBe(true)
    expect((await stat(path.join(root, 'tmp'))).isDirectory()).toBe(true)
  })

  it('stages a stream under tmp/, hashing and measuring it on the way', async () => {
    const staged = await store.stage(Readable.from([BYTES.subarray(0, 10), BYTES.subarray(10)]))

    expect(staged.tempPath).toMatch(/^tmp\/[0-9a-f-]{36}\.part$/)
    expect(staged.sizeBytes).toBe(BYTES.length)
    expect(staged.sha256).toBe(SHA256)
    expect(await readFile(path.join(root, staged.tempPath))).toEqual(BYTES)
  })

  it('commits a staged file to its final path, creating the import directory', async () => {
    const staged = await store.stage(Readable.from([BYTES]))
    const storagePath = 'imports/00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002.xlsx'

    await store.commit(staged.tempPath, storagePath)

    expect(existsSync(path.join(root, staged.tempPath))).toBe(false)
    expect(await readFile(path.join(root, storagePath))).toEqual(BYTES)
    expect(Buffer.from(await store.read(storagePath))).toEqual(BYTES)
  })

  it('reads a staged file by its temp path', async () => {
    const staged = await store.stage(Readable.from([BYTES]))

    expect(Buffer.from(await store.read(staged.tempPath))).toEqual(BYTES)
  })

  it('removes and discards files, tolerating a path that is already gone', async () => {
    const staged = await store.stage(Readable.from([BYTES]))
    const storagePath = 'imports/00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000003.xlsx'
    await store.commit(staged.tempPath, storagePath)
    const other = await store.stage(Readable.from([BYTES]))

    await store.remove(storagePath)
    await store.discard(other.tempPath)
    await expect(store.remove(storagePath)).resolves.toBeUndefined()
    await expect(store.discard(other.tempPath)).resolves.toBeUndefined()

    expect(existsSync(path.join(root, storagePath))).toBe(false)
    expect(existsSync(path.join(root, other.tempPath))).toBe(false)
  })

  it('never reads, writes or deletes outside the root', async () => {
    const staged = await store.stage(Readable.from([BYTES]))

    await expect(store.read('../outside.xlsx')).rejects.toThrow(/outside/)
    await expect(store.commit(staged.tempPath, '../../escaped.xlsx')).rejects.toThrow(/outside/)
    await expect(store.remove(`${root}/../sibling.xlsx`)).rejects.toThrow(/outside/)
    await expect(store.discard('..\\..\\evil.part')).rejects.toThrow(/outside/)
    expect(existsSync(path.join(root, staged.tempPath))).toBe(true)
  })
})
