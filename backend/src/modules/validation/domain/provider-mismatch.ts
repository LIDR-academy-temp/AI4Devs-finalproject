import type { SlotOutput, ValidationContext } from './run-validations.js'

/**
 * One blocking finding per row of another provider (design D6, D7). It copies only what the row brings and the
 * transactionId: the reported status, never the gateway's, and nothing of the foreign transaction.
 */
export function providerMismatch(ctx: ValidationContext): SlotOutput {
  return {
    applicable: ctx.partition.anyMatched,
    issues: ctx.partition.foreign.map((r) => ({
      issueType: 'provider_mismatch',
      scope: null,
      blocking: true,
      transactionIdRaw: r.transactionIdRaw,
      transactionId: r.transaction.transactionId,
      cycle: r.cycle,
      statusId: r.statusId,
      source: { fileId: r.fileId, sheetId: r.sheetId, rowNo: r.rowNo },
      occurrences: [],
    })),
  }
}
