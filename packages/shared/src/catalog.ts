// Response and query schemas of the read-only catalog API (README §3.2, §4.4).
import { z } from 'zod'
import { MerchantRef } from './auth.js'
import { ChargebackReservePolicy, Money, Percentage } from './vocabulary.js'

export const MerchantSummary = z.object({
  merchantId: z.number().int(),
  name: z.string(),
  isActive: z.boolean(),
})
export type MerchantSummary = z.infer<typeof MerchantSummary>

export const ProviderSummary = z.object({
  providerId: z.number().int(),
  merchantId: z.number().int(),
  name: z.string(),
  isActive: z.boolean(),
})
export type ProviderSummary = z.infer<typeof ProviderSummary>

/** Channel (RAM) with the settlement parameters the gateway reports for it. */
export const ChannelSummary = z.object({
  channelId: z.number().int(),
  gatewayId: z.number().int(),
  providerId: z.number().int(),
  name: z.string(),
  isActive: z.boolean(),
  settlementTermDays: z.number().int(),
  rollingReservePct: Percentage,
  rollingReserveDays: z.number().int(),
})
export type ChannelSummary = z.infer<typeof ChannelSummary>

export const AccountSummary = z.object({
  accountId: z.uuid(),
  providerId: z.number().int(),
  name: z.string(),
  chargebackReservePolicy: ChargebackReservePolicy,
  rollingReserveCapAmt: Money.nullable(),
  matchingRuleSetId: z.number().int().nullable(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
})
export type AccountSummary = z.infer<typeof AccountSummary>

/** README §4.4: provider with its accounts and channels, channel parameters included. */
export const ProviderDetail = ProviderSummary.extend({
  merchant: MerchantRef,
  accounts: z.array(AccountSummary),
  channels: z.array(ChannelSummary),
})
export type ProviderDetail = z.infer<typeof ProviderDetail>

export const AccountDetail = AccountSummary.extend({
  provider: ProviderSummary,
  merchant: MerchantRef,
})
export type AccountDetail = z.infer<typeof AccountDetail>

export const AccountRef = z.object({
  accountId: z.uuid(),
  name: z.string(),
})
export type AccountRef = z.infer<typeof AccountRef>

/** A channel associated to an account (primary or historical) and the channel's current primary account. */
export const AccountChannelItem = ChannelSummary.extend({
  isPrimary: z.boolean(),
  assignedAt: z.iso.datetime(),
  assignedInBatchId: z.uuid().nullable(),
  primaryAccount: AccountRef.nullable(),
})
export type AccountChannelItem = z.infer<typeof AccountChannelItem>

/** An account associated to a channel; at most one of them is the primary. */
export const ChannelAccountItem = z.object({
  accountId: z.uuid(),
  name: z.string(),
  providerId: z.number().int(),
  isActive: z.boolean(),
  isPrimary: z.boolean(),
  assignedAt: z.iso.datetime(),
  assignedInBatchId: z.uuid().nullable(),
})
export type ChannelAccountItem = z.infer<typeof ChannelAccountItem>

/**
 * `GET /channels?unassigned=true` lists the "not assigned yet" channels only.
 * An enum rather than `z.stringbool()` so that OpenAPI documents the two accepted values.
 */
export const ChannelsQuery = z.object({
  unassigned: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
})
export type ChannelsQuery = z.infer<typeof ChannelsQuery>
