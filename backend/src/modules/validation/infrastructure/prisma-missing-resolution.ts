// The MissingResolution port (validation-runs D11, implemented by settlement-process D11): one statement each, run with
// the transactional client of the processing or the undo, so the findings change exactly when the batch does.
import type { Prisma } from '../../../generated/prisma/client.js'
import type { MissingResolution } from '../application/ports.js'

export class PrismaMissingResolution implements MissingResolution {
  /**
   * Persistent missing findings of current runs (isSuperseded = 0) of any import of the batch's provider, whose
   * (transactionId, cycle) has a movement in the batch → resolved with the batch and the instant (an audit date).
   */
  async resolveForBatch(tx: Prisma.TransactionClient, batchId: string, at: Date): Promise<number> {
    return tx.$executeRaw`
      UPDATE vi
      SET vi.[resolutionStatus] = 'resolved', vi.[resolvedInBatchId] = ${batchId},
          vi.[resolvedAt] = CAST(${at.toISOString()} AS datetime2(7))
      FROM [ValidationIssue] vi
      JOIN [ValidationResult] r ON r.[resultId] = vi.[resultId]
      JOIN [ValidationRun] run ON run.[runId] = r.[runId] AND run.[isSuperseded] = 0
      JOIN [Import] i ON i.[importId] = run.[importId]
      JOIN [Account] a ON a.[accountId] = i.[accountId]
      WHERE vi.[issueType] = 'missing' AND vi.[resolutionStatus] = 'persistent'
        AND a.[providerId] = (SELECT ba.[providerId] FROM [SettlementBatch] b
                              JOIN [Account] ba ON ba.[accountId] = b.[accountId] WHERE b.[batchId] = ${batchId})
        AND EXISTS (SELECT 1 FROM [SettlementTransaction] st
                    WHERE st.[batchId] = ${batchId} AND st.[transactionId] = vi.[transactionId]
                      AND st.[cycle] = vi.[cycle])`
  }

  /** Missing findings resolved by this batch → persistent again; resolutions by hand are not touched. */
  async reopenForBatch(tx: Prisma.TransactionClient, batchId: string): Promise<number> {
    return tx.$executeRaw`
      UPDATE [ValidationIssue]
      SET [resolutionStatus] = 'persistent', [resolvedInBatchId] = NULL, [resolvedAt] = NULL
      WHERE [resolvedInBatchId] = ${batchId} AND [issueType] = 'missing' AND [resolvedByUserId] IS NULL`
  }
}
