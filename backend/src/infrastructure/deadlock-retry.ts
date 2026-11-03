// The retry of a transaction that SQL Server chose as a deadlock victim (settlement-process design D7), shared by the
// settlement actions and the fee administration (admin-fees design D6). Each caller says what to answer when the
// attempts run out.
import type { FastifyBaseLogger } from 'fastify'
import { Prisma } from '../generated/prisma/client.js'

/** Attempts of the transaction when SQL Server chooses it as a deadlock victim, and the base of the random pause. */
const MAX_ATTEMPTS = 3
const RETRY_PAUSE_MS = 50

/**
 * SQL Server's deadlock victim (1205) as the mssql adapter reports it: P2010 from raw SQL or P2034 from the client,
 * with the driver adapter cause of kind TransactionWriteConflict, the kind the adapter gives to 1205 and nothing else.
 */
export function isDeadlockVictim(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false
  if (error.code !== 'P2010' && error.code !== 'P2034') return false
  const cause = (error.meta as { driverAdapterError?: { cause?: { kind?: string } } } | undefined)?.driverAdapterError
    ?.cause
  return cause?.kind === 'TransactionWriteConflict'
}

export interface RetryOnDeadlockOptions {
  log?: Pick<FastifyBaseLogger, 'warn'>
  /** What identifies the transaction in the log. */
  context: Record<string, unknown>
  /** The log message of each retry. */
  message: string
  /** What to throw after the last attempt; the deadlock error itself when omitted. */
  exhausted?: () => Error
}

/**
 * The transaction, retried whole when SQL Server chooses it as a deadlock victim: up to three attempts with a short
 * random pause in between. Nothing of a failed attempt stays.
 */
export async function retryOnDeadlock<T>(transaction: () => Promise<T>, options: RetryOnDeadlockOptions): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await transaction()
    } catch (error) {
      if (!isDeadlockVictim(error)) throw error
      if (attempt === MAX_ATTEMPTS) throw options.exhausted ? options.exhausted() : error
      options.log?.warn({ ...options.context, attempt, maxAttempts: MAX_ATTEMPTS }, options.message)
      await new Promise((resolve) => setTimeout(resolve, RETRY_PAUSE_MS + Math.random() * RETRY_PAUSE_MS))
    }
  }
}
