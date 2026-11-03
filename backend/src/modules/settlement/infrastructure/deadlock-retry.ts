// The retry of a settlement transaction chosen as a deadlock victim (settlement-process design D7), shared by processing
// and by the lifecycle actions (settlement-lifecycle design D4). The retry itself is in the shared infrastructure.
import type { FastifyBaseLogger } from 'fastify'
import { retryOnDeadlock } from '../../../infrastructure/deadlock-retry.js'
import { SettlementBusyError } from '../application/errors.js'

export { isDeadlockVictim } from '../../../infrastructure/deadlock-retry.js'

export interface DeadlockRetryOptions {
  log?: Pick<FastifyBaseLogger, 'warn'>
  /** What identifies the transaction in the log. */
  context: Record<string, unknown>
}

/**
 * The transaction, retried whole when SQL Server chooses it as a deadlock victim: up to three attempts with a short
 * random pause in between; then 409 settlement_busy. Nothing of a failed attempt stays.
 */
export function withDeadlockRetry<T>(transaction: () => Promise<T>, options: DeadlockRetryOptions): Promise<T> {
  return retryOnDeadlock(transaction, {
    ...options,
    message: 'settlement chosen as deadlock victim, retrying',
    exhausted: () => new SettlementBusyError(),
  })
}
