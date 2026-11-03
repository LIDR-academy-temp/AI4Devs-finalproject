// Writes of the fee administration (admin-fees design D6): one transaction per write, holding the account row under
// UPDLOCK + HOLDLOCK so that two writes of fees of the same account wait for each other; history and audit inside it.
import type { FastifyBaseLogger } from 'fastify'
import { Prisma, type PrismaClient } from '../../../generated/prisma/client.js'
import { retryOnDeadlock } from '../../../infrastructure/deadlock-retry.js'
import { toMoney, toPercentage } from '../../../infrastructure/decimal.js'
import type { Scope } from '../../catalog/domain/scope.js'
import type { FeeAdminRepository, FeeAdminUnit } from '../application/ports.js'
import { FeeOverlapError } from '../domain/errors.js'
import type { FeeState } from '../domain/fee-patch.js'
import { businessDay } from '../domain/fee-selection.js'
import { snapshotJson } from '../domain/fee-snapshot.js'
import { usageFor, usageOf } from './fee-usage.js'
import { feeSelect, toStoredFee } from './prisma-fee-repository.js'

type Tx = Prisma.TransactionClient

/** A waiting write holds the transaction while the other one commits; well above any real fee write. */
const TX_TIMEOUT_MS = 15_000

/** The error number of TR_Fee_NoOverlap (THROW 50001), the backstop of a write that skipped the use case. */
const TRIGGER_OVERLAP_NUMBER = 50001

/**
 * TR_Fee_NoOverlap's rejection as the mssql adapter reports it: the driver adapter cause of kind `mssql` keeps the
 * SQL Server error number as `code`, the same path isDeadlockVictim reads 1205 from. By number, not by message.
 */
export function isFeeOverlapTrigger(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false
  const cause = (error.meta as { driverAdapterError?: { cause?: { kind?: string; code?: unknown } } } | undefined)
    ?.driverAdapterError?.cause
  return cause?.kind === 'mssql' && cause.code === TRIGGER_OVERLAP_NUMBER
}

const stateSelect = {
  feeId: true,
  feeTypeId: true,
  fixedAmount: true,
  percentage: true,
  conditionalPercentage: true,
  conditionThresholdAmt: true,
  brandFixedAmount: true,
  brandPercentage: true,
  startDate: true,
  endDate: true,
  description: true,
} satisfies Prisma.FeeSelect

type StateRow = Prisma.FeeGetPayload<{ select: typeof stateSelect }>

const day = (value: Date | null) => (value === null ? null : businessDay(value))
/** A DATE column takes midnight UTC of the day, as it comes back. */
const dateOf = (value: string | null) => (value === null ? null : new Date(`${value}T00:00:00.000Z`))

function toState(row: StateRow): FeeState {
  return {
    feeId: row.feeId,
    feeTypeId: row.feeTypeId,
    fixedAmount: toMoney(row.fixedAmount),
    percentage: toPercentage(row.percentage),
    conditionalPercentage: toPercentage(row.conditionalPercentage),
    conditionThresholdAmt: toMoney(row.conditionThresholdAmt),
    brandFixedAmount: toMoney(row.brandFixedAmount),
    brandPercentage: toPercentage(row.brandPercentage),
    startDate: day(row.startDate),
    endDate: day(row.endDate),
    description: row.description,
  }
}

/** The columns a write sets, from the normalized state (decimal strings, never JS numbers). */
function columns(fee: FeeState) {
  return {
    fixedAmount: fee.fixedAmount,
    percentage: fee.percentage,
    conditionalPercentage: fee.conditionalPercentage,
    conditionThresholdAmt: fee.conditionThresholdAmt,
    brandFixedAmount: fee.brandFixedAmount,
    brandPercentage: fee.brandPercentage,
    startDate: dateOf(fee.startDate),
    endDate: dateOf(fee.endDate),
    description: fee.description,
  }
}

/** The trigger's rejection as 409 fee_overlap; the use case found no conflict, so there are none to list. */
async function overlapBackstop<T>(write: Promise<T>): Promise<T> {
  try {
    return await write
  } catch (error) {
    if (isFeeOverlapTrigger(error)) throw new FeeOverlapError([])
    throw error
  }
}

export interface FeeAdminRepositoryHooks {
  /** Test hook: awaited once per unit of work, after the use case decided and before its first write. */
  beforeWrite?: () => Promise<void>
}

export class PrismaFeeAdminRepository implements FeeAdminRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly log?: Pick<FastifyBaseLogger, 'warn'>,
    private readonly hooks: FeeAdminRepositoryHooks = {},
  ) {}

  async inAccount<T>(scope: Scope, accountId: string, work: (unit: FeeAdminUnit) => Promise<T>): Promise<T | null> {
    if (scope.merchantIds.length === 0) return null
    return retryOnDeadlock(
      () =>
        this.prisma.$transaction(
          async (tx) => {
            const locked = await tx.$queryRaw<{ accountId: string }[]>`
              SELECT a.[accountId]
              FROM [Account] a WITH (UPDLOCK, HOLDLOCK)
              JOIN [Provider] p ON p.[providerId] = a.[providerId]
              WHERE a.[accountId] = ${accountId} AND p.[merchantId] IN (${Prisma.join([...scope.merchantIds])})`
            if (locked.length === 0) return null
            return work(unitOf(tx, this.hooks))
          },
          { timeout: TX_TIMEOUT_MS },
        ),
      { log: this.log, context: { accountId }, message: 'fee write chosen as deadlock victim, retrying' },
    )
  }

  async accountOfFee(scope: Scope, feeId: string): Promise<string | null> {
    const fee = await this.prisma.fee.findFirst({
      where: { feeId, account: { provider: { merchantId: { in: [...scope.merchantIds] } } } },
      select: { accountId: true },
    })
    return fee?.accountId ?? null
  }
}

function unitOf(tx: Tx, hooks: FeeAdminRepositoryHooks): FeeAdminUnit {
  let writing: Promise<void> | undefined
  const beforeWrite = () => {
    writing ??= hooks.beforeWrite?.() ?? Promise.resolve()
    return writing
  }
  return {
    feeType: (feeTypeId) => tx.feeType.findUnique({ where: { feeTypeId }, select: { isActive: true } }),

    feesOfType: async (accountId, feeTypeId) =>
      (await tx.fee.findMany({ where: { accountId, feeTypeId }, select: stateSelect })).map(toState),

    fee: async (feeId) => {
      const row = await tx.fee.findUnique({ where: { feeId }, select: { ...stateSelect, accountId: true } })
      return row === null ? null : { ...toState(row), accountId: row.accountId }
    },

    usage: async (feeId) => usageFor(await usageOf(tx, [feeId]), feeId),

    insert: async (accountId, fee, userId) => {
      await beforeWrite()
      await overlapBackstop(
        tx.fee.create({
          data: { feeId: fee.feeId, accountId, feeTypeId: fee.feeTypeId, ...columns(fee), createdByUserId: userId },
        }),
      )
    },

    update: async (fee) => {
      await beforeWrite()
      await overlapBackstop(tx.fee.update({ where: { feeId: fee.feeId }, data: columns(fee) }))
    },

    history: async (row) => {
      await tx.feeHistory.create({
        data: {
          feeId: row.feeId,
          changedByUserId: row.userId,
          action: row.action,
          beforeJson: row.before === null ? null : snapshotJson(row.before),
          afterJson: snapshotJson(row.after),
          reason: row.reason,
        },
      })
    },

    audit: async (row) => {
      await tx.auditLog.create({
        data: {
          userId: row.userId,
          action: row.action,
          entityType: 'Fee',
          entityId: row.feeId.toLowerCase(),
          detailJson: JSON.stringify(row.detail),
        },
      })
    },

    stored: async (feeId) => {
      const row = await tx.fee.findUniqueOrThrow({ where: { feeId }, select: feeSelect })
      return toStoredFee(row, usageFor(await usageOf(tx, [feeId]), feeId))
    },
  }
}
