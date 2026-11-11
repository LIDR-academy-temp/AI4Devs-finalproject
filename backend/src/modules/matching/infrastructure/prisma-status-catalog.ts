// The status catalog with the natural cycle of each status, read by the rule writes to validate fixed statuses and
// aliases (admin-matching design D2, D3) and answered by GET /matching-rules/global.
import { Cycle } from '@recon/shared'
import type { Prisma } from '../../../generated/prisma/client.js'
import type { StatusCatalogEntry } from '../domain/rules.js'

/** A client or a transaction: both have the delegate the read uses. */
type Client = Pick<Prisma.TransactionClient, 'transactionStatus'>

/** Every status by id. The cycle column only holds E or I (the catalog seed); anything else is a data error. */
export async function readStatusCatalog(client: Client): Promise<StatusCatalogEntry[]> {
  const rows = await client.transactionStatus.findMany({
    select: { statusId: true, name: true, cycle: true },
    orderBy: { statusId: 'asc' },
  })
  return rows.map((s) => ({ ...s, cycle: Cycle.parse(s.cycle) }))
}
