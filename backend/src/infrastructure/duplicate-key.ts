// SQL Server's duplicate key rejection as the mssql adapter reports it (admin-accounts design D5), shared by the
// backstops of the unique names (accounts, matching rule sets).
import { Prisma } from '../generated/prisma/client.js'

/** SQL Server's duplicate key errors: unique constraint (2627) and unique index (2601). */
const DUPLICATE_KEY_NUMBERS = new Set([2627, 2601])

/**
 * P2002 from the client, or the SQL Server error number in the driver adapter cause, the path isFeeOverlapTrigger
 * reads 50001 from. By number, not by message: the caller knows which unique key its write can hit.
 */
export function isDuplicateKey(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false
  if (error.code === 'P2002') return true
  const cause = (error.meta as { driverAdapterError?: { cause?: { kind?: string; code?: unknown } } } | undefined)
    ?.driverAdapterError?.cause
  return cause?.kind === 'mssql' && typeof cause.code === 'number' && DUPLICATE_KEY_NUMBERS.has(cause.code)
}
