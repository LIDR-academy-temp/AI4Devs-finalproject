import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PrismaClient } from '../../src/generated/prisma/client.js'
import { createPrismaClient } from './helpers.js'

// Migration 0004_validation_outcome (design D12): CK_ValidationResult_outcome takes the new vocabulary (warning,
// blocked; no failed) and CK_ValidationIssue_issueType takes status_mismatch, which CK_ValidationIssue_blocking keeps
// non-blocking. Migration 0005_conflict_occurrence_unresolved_status: an occurrence may have no statusId (the row's
// status could not be resolved). One minimal run over a seeded import; everything created is removed in afterAll.
let prisma: PrismaClient
let runId: number | null = null

beforeAll(async () => {
  prisma = createPrismaClient()
  const imported = await prisma.import.findFirstOrThrow({ orderBy: { importId: 'asc' } })
  const analyst = await prisma.user.findFirstOrThrow({ where: { userName: 'analyst' } })
  const run = await prisma.validationRun.create({
    data: { importId: imported.importId, runByUserId: analyst.userId, isSuperseded: true },
  })
  runId = run.runId
})

afterAll(async () => {
  if (runId !== null) {
    await prisma.conflictOccurrence.deleteMany({ where: { issue: { result: { runId } } } })
    await prisma.validationIssue.deleteMany({ where: { result: { runId } } })
    await prisma.validationResult.deleteMany({ where: { runId } })
    await prisma.validationRun.delete({ where: { runId } })
  }
  await prisma.$disconnect()
})

const result = (validationCode: string, outcome: string) =>
  prisma.validationResult.create({ data: { runId: runId!, validationCode, outcome } })

describe('CK_ValidationResult_outcome', () => {
  it('accepts warning and blocked', async () => {
    await expect(result('duplicate_in_batch', 'warning')).resolves.toMatchObject({ outcome: 'warning' })
    await expect(result('provider_mismatch', 'blocked')).resolves.toMatchObject({ outcome: 'blocked' })
  })

  it('rejects failed', async () => {
    await expect(result('missing_in_range', 'failed')).rejects.toThrow(/CK_ValidationResult_outcome/)
  })
})

describe('CK_ValidationIssue_issueType with status_mismatch', () => {
  const issue = async (blocking: boolean) => {
    const owner = await prisma.validationResult.findFirstOrThrow({
      where: { runId: runId!, validationCode: 'duplicate_in_batch' },
    })
    return prisma.validationIssue.create({
      data: { resultId: owner.resultId, issueType: 'status_mismatch', blocking, cycle: 'E', statusId: 3 },
    })
  }

  it('accepts a non-blocking status_mismatch', async () => {
    await expect(issue(false)).resolves.toMatchObject({ issueType: 'status_mismatch', blocking: false })
  })

  it('rejects a blocking status_mismatch (CK_ValidationIssue_blocking)', async () => {
    await expect(issue(true)).rejects.toThrow(/CK_ValidationIssue_blocking/)
  })
})

describe('ConflictOccurrence.statusId nullable (0005)', () => {
  it('accepts an occurrence without status next to one with status', async () => {
    const owner = await prisma.validationResult.findFirstOrThrow({
      where: { runId: runId!, validationCode: 'duplicate_in_batch' },
    })
    const issue = await prisma.validationIssue.create({
      data: { resultId: owner.resultId, issueType: 'collision', scope: 'in_batch', blocking: false, cycle: 'E' },
    })
    const occurrence = (statusId: number | null) => ({
      issueId: issue.issueId,
      sourceType: 'current_import',
      statusId,
      includeInSettlement: true,
      defaultIncluded: true,
    })

    await prisma.conflictOccurrence.createMany({ data: [occurrence(2), occurrence(null)] })

    const stored = await prisma.conflictOccurrence.findMany({
      where: { issueId: issue.issueId },
      orderBy: { occurrenceId: 'asc' },
    })
    expect(stored.map((o) => o.statusId)).toEqual([2, null])
  })
})
