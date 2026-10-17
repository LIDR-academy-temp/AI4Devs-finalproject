// Prisma rows of Transaction (with gateway, channel and status names) → the domain's TransactionRef.
import type { Prisma } from '../../../generated/prisma/client.js'
import { toMoney } from '../../../infrastructure/decimal.js'
import type { TransactionRef } from '../domain/match-rows.js'

export const transactionRefSelect = {
  transactionId: true,
  gatewayId: true,
  sourceTransactionId: true,
  channelId: true,
  providerId: true,
  statusId: true,
  amount: true,
  transactionDate: true,
  gateway: { select: { name: true } },
  channel: { select: { name: true } },
  status: { select: { name: true } },
} satisfies Prisma.TransactionSelect

export type TransactionRefRow = Prisma.TransactionGetPayload<{ select: typeof transactionRefSelect }>

export function toTransactionRef(row: TransactionRefRow): TransactionRef {
  return {
    transactionId: row.transactionId,
    gatewayId: row.gatewayId,
    gatewayName: row.gateway.name,
    sourceTransactionId: row.sourceTransactionId,
    channelId: row.channelId,
    channelName: row.channel.name,
    providerId: row.providerId,
    statusId: row.statusId,
    statusName: row.status.name,
    amount: toMoney(row.amount),
    transactionDate: row.transactionDate,
  }
}
