// The load of the engine input (settlement-process design D2): the same reads for the preview (outside a
// transaction) and for processing (inside it, after the guard on Import).
import type { BatchFeeInput } from '@recon/shared'
import type { SettlementAccount, SettlementInput } from '../domain/types.js'
import type { CurrentRun, SettlementSource } from './ports.js'

export interface LoadRequest {
  importId: string
  account: SettlementAccount
  run: CurrentRun
  prefilledFeeTypeIds: ReadonlySet<number>
  request: { batchNo?: number; settlementDate?: string; batchFees?: readonly BatchFeeInput[] }
  options: SettlementInput['options']
}

export async function loadSettlementInput(source: SettlementSource, load: LoadRequest): Promise<SettlementInput> {
  const { importId, account, run } = load
  const rows = await source.rows(importId)
  const matched = rows.flatMap((r) => (r.transaction ? [r.transaction] : []))
  const channelIds = [...new Set(matched.map((t) => t.channelId))]
  const transactionIds = [...new Set(matched.map((t) => t.transactionId))]
  // One after another: inside an interactive transaction the reads share one connection.
  const inclusions = await source.inclusions(run.runId)
  const channels = await source.channels(account.accountId, channelIds)
  const previousE = await source.previousE(account.providerId, transactionIds, importId)
  const fees = await source.accountFees(account.accountId)
  const feeTypes = await source.feeTypes()
  const attempts = await source.attempts(account.accountId)
  return {
    importId,
    account,
    runId: run.runId,
    ranges: run.ranges,
    rows,
    inclusions,
    channels,
    previousE,
    fees,
    feeTypes,
    attempts,
    prefilledFeeTypeIds: load.prefilledFeeTypeIds,
    request: load.request,
    options: load.options,
  }
}
