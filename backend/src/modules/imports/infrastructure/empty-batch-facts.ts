// The facts of an empty batch (README §3.3 "Batch sin filas asociadas", #92; design D1): one grouped query over the
// rows of the import, usable inside an interactive transaction (review, processing) or outside it (detail, preview).
import type { PrismaClient } from '../../../generated/prisma/client.js'
import { type EmptyBatchFacts, factsOf } from '../domain/empty-batch.js'

/** The client or an interactive transaction: only raw queries are needed. */
export type FactsDb = Pick<PrismaClient, '$queryRaw'>

interface Group {
  matchResult: string
  reason: string | null
  n: number | bigint
  own: number | bigint
}

/**
 * Only transaction sheets have persisted rows (the analysis writes no other), so every row counts. `own` is a matched
 * row whose transaction belongs to `providerId`: an ambiguous row resolved by the analyst is matched by then.
 */
export async function loadEmptyBatchFacts(db: FactsDb, importId: string, providerId: number): Promise<EmptyBatchFacts> {
  const groups = await db.$queryRaw<Group[]>`
    SELECT r.[matchResult] AS matchResult, JSON_VALUE(r.[detailJson], '$.reason') AS reason, COUNT(*) AS n,
           SUM(CASE WHEN r.[matchResult] = 'matched' AND t.[providerId] = ${providerId} THEN 1 ELSE 0 END) AS own
    FROM [ImportRow] r
    JOIN [ImportSheet] s ON s.[sheetId] = r.[sheetId]
    JOIN [ImportFile] f ON f.[fileId] = s.[fileId]
    LEFT JOIN [Transaction] t ON t.[transactionId] = r.[transactionId]
    WHERE f.[importId] = ${importId}
    GROUP BY r.[matchResult], JSON_VALUE(r.[detailJson], '$.reason')`
  return factsOf(
    groups.map((g) => ({ matchResult: g.matchResult, reason: g.reason, n: Number(g.n), own: Number(g.own) })),
  )
}
