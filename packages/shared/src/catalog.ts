// Schemas of the catalog API (README §3.2, §4.4): the read-only hierarchy and the account administration.
import { z } from 'zod'
import { MerchantRef, UserRef } from './auth.js'
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
  createdBy: UserRef,
  updatedAt: z.iso.datetime(),
})
export type AccountDetail = z.infer<typeof AccountDetail>

export const AccountRef = z.object({
  accountId: z.uuid(),
  name: z.string(),
})
export type AccountRef = z.infer<typeof AccountRef>

/** The batch whose processing created an account–channel association; both null when none did. */
const assignment = {
  isPrimary: z.boolean(),
  assignedAt: z.iso.datetime(),
  assignedInBatchId: z.uuid().nullable(),
  assignedInBatchNo: z.number().int().nullable(),
}

/** A channel associated to an account (primary or historical) and the channel's current primary account. */
export const AccountChannelItem = ChannelSummary.extend({
  ...assignment,
  /** null if the channel has no primary account or the caller cannot see it. */
  primaryAccount: AccountRef.nullable(),
})
export type AccountChannelItem = z.infer<typeof AccountChannelItem>

/** An account associated to a channel; at most one of them is the primary. */
export const ChannelAccountItem = z.object({
  accountId: z.uuid(),
  name: z.string(),
  providerId: z.number().int(),
  isActive: z.boolean(),
  ...assignment,
})
export type ChannelAccountItem = z.infer<typeof ChannelAccountItem>

/** A row of `GET /channels`: the channel and its primary account (null if none or outside the caller's scope). */
export const ChannelListItem = ChannelSummary.extend({
  primaryAccount: AccountRef.nullable(),
})
export type ChannelListItem = z.infer<typeof ChannelListItem>

/** `GET /providers/{id}/matching-rule-sets`: a rule set of the provider and the accounts linked to it. */
export const MatchingRuleSetSummary = z.object({
  ruleSetId: z.number().int(),
  providerId: z.number().int(),
  name: z.string(),
  isActive: z.boolean(),
  accounts: z.array(AccountRef.extend({ isActive: z.boolean() })),
})
export type MatchingRuleSetSummary = z.infer<typeof MatchingRuleSetSummary>

// ───────────────────────── Account administration ─────────────────────────

const AccountName = z.string().trim().min(1).max(50)
const RuleSetId = z.number().int().positive()

/**
 * Body of POST /providers/{id}/accounts. A negative cap, a rule set of another provider and a fee source outside
 * the provider are domain rules answered as 400 validation_error with details.field, not schema rules.
 */
export const AccountCreate = z.strictObject({
  name: AccountName,
  chargebackReservePolicy: ChargebackReservePolicy,
  /** null or omitted: no cap. */
  rollingReserveCapAmt: Money.nullable().optional(),
  /** null or omitted: global rules only. */
  matchingRuleSetId: RuleSetId.nullable().optional(),
  /** null or omitted: the account starts without fees. */
  copyFeesFromAccountId: z.uuid().nullable().optional(),
})
export type AccountCreate = z.infer<typeof AccountCreate>

/** Body of PATCH /accounts/{id}: any subset of the editable fields; providerId is not editable. */
export const AccountPatch = z
  .strictObject({
    name: AccountName.optional(),
    chargebackReservePolicy: ChargebackReservePolicy.optional(),
    rollingReserveCapAmt: Money.nullable().optional(),
    matchingRuleSetId: RuleSetId.nullable().optional(),
    /** false closes the account, true reopens it. */
    isActive: z.boolean().optional(),
    /** Optional reason kept in the audit log. */
    reason: z.string().trim().min(1).max(500).optional(),
  })
  .refine((b) => Object.keys(b).some((k) => k !== 'reason'), 'at least one field to change is required')
export type AccountPatch = z.infer<typeof AccountPatch>

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
