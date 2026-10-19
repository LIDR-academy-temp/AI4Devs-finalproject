import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PrismaClient } from '../../src/generated/prisma/client.js'
import { createPrismaClient } from './helpers.js'

// Migration 0006_validation_runs (design D6, D10): one current run per import (UX_ValidationRun_current_import),
// the two informative counters of a run default to 0, and ImportSheet.sheetIndex takes NULL or a non-negative
// position (CK_ImportSheet_sheetIndex). Everything created is removed in afterAll.
let prisma: PrismaClient
let importId: string
let analystId: number
const createdRuns: number[] = []

beforeAll(async () => {
  prisma = createPrismaClient()
  // An import nobody validates: no run of the seed or of other tests is current on it.
  const imported = await prisma.import.findFirstOrThrow({ orderBy: { importId: 'asc' } })
  importId = imported.importId
  analystId = (await prisma.user.findFirstOrThrow({ where: { userName: 'analyst' } })).userId
  await prisma.validationRun.updateMany({ where: { importId, isSuperseded: false }, data: { isSuperseded: true } })
})

afterAll(async () => {
  if (createdRuns.length > 0) await prisma.validationRun.deleteMany({ where: { runId: { in: createdRuns } } })
  await prisma.$disconnect()
})

const createRun = async (isSuperseded: boolean) => {
  const run = await prisma.validationRun.create({ data: { importId, runByUserId: analystId, isSuperseded } })
  createdRuns.push(run.runId)
  return run
}

describe('UX_ValidationRun_current_import', () => {
  it('accepts a superseded run next to a current one', async () => {
    await createRun(true)
    await expect(createRun(false)).resolves.toMatchObject({ isSuperseded: false })
  })

  it('rejects a second current run of the same import', async () => {
    await expect(createRun(false)).rejects.toThrow(/UX_ValidationRun_current_import|duplicate key|Unique constraint/i)
    expect(await prisma.validationRun.count({ where: { importId, isSuperseded: false } })).toBe(1)
  })
})

describe('ValidationRun informative counters', () => {
  it('default to 0', async () => {
    const run = await createRun(true)

    expect(run.undatedAdjustmentCount).toBe(0)
    expect(run.undatedCandidateCount).toBe(0)
  })
})

describe('ImportSheet.sheetIndex', () => {
  // A file and a sheet of its own: the seed creates none, and other suites remove theirs.
  const fileId = randomUUID()
  const sheetId = randomUUID()

  beforeAll(async () => {
    await prisma.importFile.create({
      data: {
        fileId,
        importId,
        fileName: 'schema-test.xlsx',
        storagePath: 'none',
        sizeBytes: 1,
        sha256: fileId.replaceAll('-', '').padEnd(64, '0'),
      },
    })
    await prisma.importSheet.create({
      data: { sheetId, fileId, sheetName: 'APP', kind: 'transactions', sheetIndex: 0 },
    })
  })

  afterAll(async () => {
    await prisma.importSheet.deleteMany({ where: { sheetId } })
    await prisma.importFile.deleteMany({ where: { fileId } })
  })

  it('rejects a negative position (CK_ImportSheet_sheetIndex)', async () => {
    await expect(
      prisma.$executeRaw`UPDATE [ImportSheet] SET sheetIndex = -1 WHERE sheetId = ${sheetId}`,
    ).rejects.toThrow(/CK_ImportSheet_sheetIndex/)
  })

  it('accepts NULL', async () => {
    await prisma.importSheet.update({ where: { sheetId }, data: { sheetIndex: null } })

    expect((await prisma.importSheet.findUniqueOrThrow({ where: { sheetId } })).sheetIndex).toBeNull()
  })
})
