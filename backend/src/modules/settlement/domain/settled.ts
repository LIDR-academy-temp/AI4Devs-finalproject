// Settled comes from the attempt, never from settlementStatusId (spec settlement "Settled derivado del intento").
import type { BatchStatus, SettledStatus } from '@recon/shared'

export function settledStatusOf(status: BatchStatus): SettledStatus {
  return status === 'paid' ? 'settled' : status === 'undone' ? 'undone' : 'pending_payment'
}

export function isSettled(status: BatchStatus): boolean {
  return status === 'paid'
}
