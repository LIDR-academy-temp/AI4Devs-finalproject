import { createHmac } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaMssql } from '@prisma/adapter-mssql'
import { config as loadDotenv } from 'dotenv'
import { buildApp } from '../../src/app.js'
import { loadEnv } from '../../src/config/env.js'
import { PrismaClient } from '../../src/generated/prisma/client.js'
import { mssqlConfigFromEnv } from '../../src/infrastructure/db.js'

// The .env lives at the repository root; CI provides the variables directly.
loadDotenv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.env'), quiet: true })

export const TEST_JWT_SECRET = 'integration-test-secret-not-a-real-one-0001'
export const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'Recon2026!'

/** A Prisma client against the SQL Server of the environment (repository-level integration tests). */
export function createPrismaClient(envOverrides: Record<string, string> = {}): PrismaClient {
  const env = loadEnv({ ...process.env, ...envOverrides, JWT_SECRET: TEST_JWT_SECRET })
  return new PrismaClient({ adapter: new PrismaMssql(mssqlConfigFromEnv(env)) })
}

/**
 * Builds the real app against SQL Server; every log line (level trace) is captured in `logLines`.
 * `envOverrides` win over the process environment (e.g. a temporary UPLOAD_DIR).
 */
export async function createTestApp(envOverrides: Record<string, string> = {}) {
  const env = loadEnv({ ...process.env, ...envOverrides, JWT_SECRET: TEST_JWT_SECRET, LOG_LEVEL: 'trace' })
  const prisma = createPrismaClient(envOverrides)
  const logLines: string[] = []
  const app = await buildApp({ env, prisma, logStream: { write: (line) => void logLines.push(line) } })
  return { app, prisma, logLines }
}

/** Decodes a JWT payload without verifying it. */
export function decodePayload(token: string): Record<string, unknown> {
  const [, payload] = token.split('.')
  return JSON.parse(Buffer.from(payload!, 'base64url').toString('utf8'))
}

/** Signs an HS256 JWT with the given claims, independently of the library used by the app. */
export function signHs256(claims: Record<string, unknown>, secret: string): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
  const head = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(claims)}`
  const signature = createHmac('sha256', secret).update(head).digest('base64url')
  return `${head}.${signature}`
}

/**
 * An id a cleanup filters on. In a Prisma filter an undefined value drops the condition, so a deleteMany of a fixture
 * whose setup failed would empty the whole table: fail instead of deleting.
 */
export function fixtureId<T>(value: T | null | undefined, name: string): T {
  if (value === undefined || value === null) throw new Error(`cleanup refused: ${name} is not defined`)
  return value
}

/** Prefix of the accounts the Bruno flow leaves closed in Provider C until the next `pnpm db:seed` (admin-accounts D9). */
export const BRUNO_ACCOUNT_PREFIX = 'bruno-'

/** The accounts of a listing without those of the Bruno collection: what a test that expects the seed's exact list compares. */
export function seedAccounts<T extends { name: string }>(accounts: readonly T[]): T[] {
  return accounts.filter((a) => !a.name.startsWith(BRUNO_ACCOUNT_PREFIX))
}

/** The ids of an `in` filter of a cleanup: the list and each id defined (an empty list deletes nothing). */
export function fixtureIds<T>(values: readonly (T | null | undefined)[] | undefined, name: string): T[] {
  if (values === undefined) throw new Error(`cleanup refused: ${name} is not defined`)
  return values.map((v, i) => fixtureId(v, `${name}[${i}]`))
}

/** What applyFeeUsage wrote, for removeFeeUsage. */
export interface FeeUsageFixture {
  appliedFeeIds: bigint[]
  batchFeeIds: number[]
  /** The seeded batch the batch fee went to, with its settlement date as a business day. */
  batch: { batchId: string; settlementDate: string } | null
  /** Set when the fixture turned that seeded paid batch into an undone attempt: restored on removal. */
  undone: boolean
}

/**
 * Puts a fee in use (admin-fees design D5). The seed processes batches without fee breakdowns or batch fees, so a
 * test that needs a fee in use writes them here and removes them with removeFeeUsage:
 * - `days`: one movement breakdown per business day, on a seeded movement of the fee's account;
 * - `batchFee`: one batch fee on the seeded batch of the account with the latest settlement date; with
 *   `undone: true` that batch is turned into an undone attempt until the removal.
 */
export async function applyFeeUsage(
  prisma: PrismaClient,
  feeId: string,
  { days = [], batchFee }: { days?: readonly string[]; batchFee?: { undone?: boolean } },
): Promise<FeeUsageFixture> {
  const fee = await prisma.fee.findUniqueOrThrow({ where: { feeId }, select: { accountId: true, feeTypeId: true } })
  const fixture: FeeUsageFixture = { appliedFeeIds: [], batchFeeIds: [], batch: null, undone: false }
  if (days.length > 0) {
    const movement = await prisma.settlementTransaction.findFirstOrThrow({
      where: { batch: { accountId: fee.accountId } },
      select: { settlementTxnId: true },
      orderBy: { settlementTxnId: 'asc' },
    })
    for (const day of days) {
      const row = await prisma.settlementTransactionFee.create({
        data: {
          settlementTxnId: movement.settlementTxnId,
          feeId,
          feeTypeId: fee.feeTypeId,
          eventDate: new Date(`${day}T15:30:00Z`),
          amountUsd: '1.0000',
          configurationSnapshot: '{"fixture":"fee usage"}',
        },
        select: { appliedFeeId: true },
      })
      fixture.appliedFeeIds.push(row.appliedFeeId)
    }
  }
  if (batchFee) {
    const batch = await prisma.settlementBatch.findFirstOrThrow({
      where: { accountId: fee.accountId, status: 'paid', settlementDate: { not: null } },
      select: { batchId: true, settlementDate: true, approvedByUserId: true },
      orderBy: [{ settlementDate: 'desc' }, { batchNo: 'desc' }],
    })
    fixture.batch = { batchId: batch.batchId, settlementDate: batch.settlementDate!.toISOString().slice(0, 10) }
    const row = await prisma.settlementBatchFee.create({
      data: {
        batchId: batch.batchId,
        feeTypeId: fee.feeTypeId,
        feeId,
        amount: '1.0000',
        description: 'fixture fee usage',
        enteredByUserId: batch.approvedByUserId,
      },
      select: { batchFeeId: true },
    })
    fixture.batchFeeIds.push(row.batchFeeId)
    if (batchFee.undone) {
      await prisma.settlementBatch.update({
        where: { batchId: batch.batchId },
        data: { status: 'undone', undoneAt: new Date(), undoneByUserId: batch.approvedByUserId, undoReason: 'fixture' },
      })
      fixture.undone = true
    }
  }
  return fixture
}

/**
 * Oracle of a fee's last applied event day, straight from the tables (spec fees "Uso de un fee"): the latest of the
 * event days of its breakdowns and of the settlement dates of the batches that charged it as a batch fee.
 */
export async function lastAppliedOf(prisma: PrismaClient, feeId: string): Promise<string | null> {
  const [breakdowns, batchFees] = await Promise.all([
    prisma.settlementTransactionFee.aggregate({ where: { feeId }, _max: { eventDate: true } }),
    prisma.settlementBatchFee.findMany({ where: { feeId }, select: { batch: { select: { settlementDate: true } } } }),
  ])
  const days = [breakdowns._max.eventDate, ...batchFees.map((b) => b.batch.settlementDate)].flatMap((d) =>
    d === null ? [] : [d.toISOString().slice(0, 10)],
  )
  return days.length === 0 ? null : days.reduce((a, b) => (a > b ? a : b))
}

/** Removes what applyFeeUsage wrote and gives the seeded batch back its paid state. */
export async function removeFeeUsage(prisma: PrismaClient, fixtures: readonly FeeUsageFixture[]) {
  for (const fixture of fixtures) {
    await prisma.settlementTransactionFee.deleteMany({
      where: { appliedFeeId: { in: fixtureIds(fixture.appliedFeeIds, 'fixture fee usages') } },
    })
    await prisma.settlementBatchFee.deleteMany({
      where: { batchFeeId: { in: fixtureIds(fixture.batchFeeIds, 'fixture batch fees') } },
    })
    if (fixture.undone)
      await prisma.settlementBatch.update({
        where: { batchId: fixtureId(fixture.batch?.batchId, 'fixture undone batch') },
        data: { status: 'paid', undoneAt: null, undoneByUserId: null, undoReason: null },
      })
  }
}
