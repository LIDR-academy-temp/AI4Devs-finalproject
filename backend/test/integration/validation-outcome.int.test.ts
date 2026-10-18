import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PrismaClient } from '../../src/generated/prisma/client.js'
import { createPrismaClient } from './helpers.js'

// Migration 0004_validation_outcome (design D12): CK_ValidationResult_outcome takes the new vocabulary (warning,
// blocked; no failed) and CK_ValidationIssue_issueType takes status_mismatch, which CK_ValidationIssue_blocking keeps
// non-blocking. Migration 0005_conflict_occurrence_unresolved_status: an occurrence may have no statusId (the row's
// status could not be resolved). One minimal run over a seeded import; everything created is removed in afterAll.
let prisma: PrismaClient
let runId: number | null = null
/** TransactionStatus ids by code, read from the database instead of written by hand. */
const status: Record<string, number> = {}

beforeAll(async () => {
  prisma = createPrismaClient()
  for (const s of await prisma.transactionStatus.findMany()) status[s.code] = s.statusId
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

/** The result a finding of that validation belongs to, created on first use. */
const ownerOf = (validationCode: string) =>
  prisma.validationResult.upsert({
    where: { runId_validationCode: { runId: runId!, validationCode } },
    create: { runId: runId!, validationCode, outcome: 'warning' },
    update: {},
  })

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
    // status_mismatch is produced by the non_recorded_adjustment validation.
    const owner = await ownerOf('non_recorded_adjustment')
    return prisma.validationIssue.create({
      data: { resultId: owner.resultId, issueType: 'status_mismatch', blocking, cycle: 'E', statusId: status.Declined },
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
  const collision = async () => {
    const owner = await ownerOf('status_collision_in_batch')
    return prisma.validationIssue.create({
      data: { resultId: owner.resultId, issueType: 'collision', scope: 'in_batch', blocking: false, cycle: 'E' },
    })
  }
  const occurrence = (issueId: number, statusId: number | null) => ({
    issueId,
    sourceType: 'current_import',
    statusId,
    includeInSettlement: true,
    defaultIncluded: true,
  })

  it('accepts an occurrence without status next to one with status', async () => {
    const issue = await collision()

    await prisma.conflictOccurrence.createMany({
      data: [occurrence(issue.issueId, status.Successful!), occurrence(issue.issueId, null)],
    })

    const stored = await prisma.conflictOccurrence.findMany({
      where: { issueId: issue.issueId },
      orderBy: { occurrenceId: 'asc' },
    })
    expect(stored.map((o) => o.statusId)).toEqual([status.Successful, null])
  })

  it('still rejects a statusId outside TransactionStatus (the FK was recreated)', async () => {
    const issue = await collision()
    const missing = Math.max(...Object.values(status)) + 1_000

    await expect(prisma.conflictOccurrence.create({ data: occurrence(issue.issueId, missing) })).rejects.toThrow(
      /ConflictOccurrence_statusId_fkey|foreign key/i,
    )
  })
})
