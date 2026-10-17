// Prisma adapter of TransactionLookup (spec: import, D4): one query per batch of pairs, the pairs travelling as a
// single JSON parameter and joined to Transaction through OPENJSON. The ids are typed VARCHAR(36) inside the query
// on purpose: Prisma binds strings as NVARCHAR, and the implicit conversion against the VARCHAR column turned the
// unique index (gatewayId, sourceTransactionId) into a scan (measured: 268 ms per 500 ids; 55 ms once typed).
// The join is already by exact pair; the domain keeps its own exact-pair filter regardless (matchRow).
import { Prisma, type PrismaClient } from '../../../generated/prisma/client.js'
import { toMoney } from '../../../infrastructure/decimal.js'
import type { TransactionLookup } from '../application/ports.js'
import type { TransactionRef } from '../domain/match-rows.js'
import type { IdCandidate } from '../domain/normalize-source-id.js'
import { LOOKUP_PAIRS_PER_QUERY } from './sql-limits.js'

/** Width of Transaction.sourceTransactionId: a longer id cannot be stored, so it cannot match. */
const SOURCE_ID_MAX_LENGTH = 36

/** The raw row as the driver returns it; every column is narrowed explicitly below. */
interface RawTransactionRow {
  transactionId: unknown
  gatewayId: unknown
  sourceTransactionId: unknown
  channelId: unknown
  providerId: unknown
  merchantId: unknown
  statusId: unknown
  amount: unknown
  transactionDate: unknown
  gatewayName: unknown
  channelName: unknown
  statusName: unknown
}

function toRef(row: RawTransactionRow): TransactionRef {
  return {
    transactionId: typeof row.transactionId === 'bigint' ? row.transactionId : BigInt(String(row.transactionId)),
    gatewayId: Number(row.gatewayId),
    gatewayName: String(row.gatewayName),
    sourceTransactionId: String(row.sourceTransactionId),
    channelId: Number(row.channelId),
    channelName: String(row.channelName),
    providerId: Number(row.providerId),
    merchantId: Number(row.merchantId),
    statusId: Number(row.statusId),
    statusName: String(row.statusName),
    amount: toMoney(new Prisma.Decimal(String(row.amount))),
    transactionDate: row.transactionDate instanceof Date ? row.transactionDate : new Date(String(row.transactionDate)),
  }
}

export class PrismaTransactionLookup implements TransactionLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async findByExternalIds(pairs: IdCandidate[]): Promise<TransactionRef[]> {
    const storable = pairs.filter((p) => p.sourceTransactionId.length <= SOURCE_ID_MAX_LENGTH)
    const found: TransactionRef[] = []
    for (let offset = 0; offset < storable.length; offset += LOOKUP_PAIRS_PER_QUERY) {
      const batch = storable.slice(offset, offset + LOOKUP_PAIRS_PER_QUERY)
      const json = JSON.stringify(batch.map((p) => ({ g: p.gatewayId, s: p.sourceTransactionId })))
      const rows = await this.prisma.$queryRaw<RawTransactionRow[]>`
        SELECT t.[transactionId], t.[gatewayId], t.[sourceTransactionId], t.[channelId], t.[providerId], t.[merchantId], t.[statusId],
               t.[amount], t.[transactionDate], g.[name] AS gatewayName, c.[name] AS channelName, s.[name] AS statusName
        FROM OPENJSON(${json}) WITH ([gatewayId] INT '$.g', [sourceTransactionId] VARCHAR(36) '$.s') p
        JOIN [Transaction] t ON t.[gatewayId] = p.[gatewayId] AND t.[sourceTransactionId] = p.[sourceTransactionId]
        JOIN [Gateway] g ON g.[gatewayId] = t.[gatewayId]
        JOIN [Channel] c ON c.[channelId] = t.[channelId]
        JOIN [TransactionStatus] s ON s.[statusId] = t.[statusId]`
      for (const row of rows) found.push(toRef(row))
    }
    return found
  }
}
