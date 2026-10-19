/**
 * Idempotent seed for Recon Tool 2.0.
 *
 * Empties the tables in dependency order and reloads the synthetic world from
 * `synthetic.ts`: catalogs, roles and users, gateways/merchants/providers/channels,
 * accounts with their fees and matching rules, ~24k transactions and the history of
 * paid batches for each account. Running it twice leaves the database exactly the same.
 *
 *   pnpm --filter backend db:seed          (or: prisma db seed)
 *
 * Variables: DB_HOST, DB_PORT, DB_NAME, DB_USER, RECON_APP_PASSWORD, SEED_PASSWORD (password
 * for the four demo users; defaults to "Recon2026!").
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaMssql } from '@prisma/adapter-mssql'
import { Decimal } from '@prisma/client/runtime/client'
import { ROLES } from '@recon/shared'
import argon2 from 'argon2'
import { config as loadEnv } from 'dotenv'
import { PrismaClient } from '../src/generated/prisma/client.js'
import {
  ACCOUNT_FEES,
  ACCOUNTS,
  amount4,
  type BatchPlan,
  buildWorld,
  CHANNELS,
  CYCLES,
  FEE_TYPES,
  GATEWAYS,
  GLOBAL_COLUMN_RULES,
  GLOBAL_ROW_IGNORES,
  GLOBAL_SHEET_RULES,
  LEGACY_RULE_SET,
  MERCHANTS,
  mulberry32,
  PROVIDERS,
  SETTLEMENT_STATUSES,
  type SettlementMovement,
  STATUS,
  STATUS_ALIASES,
  type StatusCode,
  settlementMovementsOf,
  TRANSACTION_STATUSES,
  USERS,
  uid,
  type World,
} from './synthetic.js'

// The .env lives at the repository root, two levels above prisma/
loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') })

const adapter = new PrismaMssql({
  server: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 1433),
  database: process.env.DB_NAME ?? 'ReconTool',
  user: process.env.DB_USER ?? 'recon_app',
  password: process.env.RECON_APP_PASSWORD ?? '',
  options: { encrypt: true, trustServerCertificate: true },
})
const prisma = new PrismaClient({ adapter })

const CHUNK = 1000
async function chunked<T>(rows: T[], fn: (rows: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += CHUNK) await fn(rows.slice(i, i + CHUNK))
}
const log = (msg: string) => console.log(`[seed] ${msg}`)

async function wipe() {
  // Reverse dependency order. DELETE (not TRUNCATE) because of the FKs.
  const tables = [
    'AuditLog',
    'SettlementTransactionFee',
    'SettlementTransaction',
    'SettlementBatchBrandTotal',
    'SettlementBatchTotal',
    'SettlementBatchFee',
    'ConflictOccurrence',
    'ValidationIssue',
    'ValidationResult',
    'ValidationRun',
    'ImportRow',
    'ImportSheetColumnMap',
    'ImportSheet',
    'ImportFile',
  ]
  for (const t of tables) await prisma.$executeRawUnsafe(`DELETE FROM [dbo].[${t}]`)
  // Import ↔ SettlementBatch reference each other: break the cycle before deleting.
  await prisma.$executeRawUnsafe('UPDATE [dbo].[Import] SET [currentBatchId] = NULL')
  await prisma.$executeRawUnsafe('UPDATE [dbo].[AccountChannel] SET [assignedInBatchId] = NULL')
  for (const t of [
    'SettlementBatch',
    'Import',
    'AccountChannel',
    'FeeHistory',
    'Fee',
    'Account',
    'MatchingRowIgnoreRule',
    'MatchingColumnRule',
    'MatchingSheetRule',
    'MatchingRuleSet',
    'MatchingStatusAlias',
    'Transaction',
    'Channel',
    'Provider',
    // UserMerchant references Merchant: it must go first.
    'UserMerchant',
    'Merchant',
    'Gateway',
    'FeeType',
    'TransactionStatus',
    'SettlementStatus',
    'Cycle',
    'RefreshToken',
    'User',
    'RolePermission',
    'Role',
  ]) {
    await prisma.$executeRawUnsafe(`DELETE FROM [dbo].[${t}]`)
  }
  // Reset identities so that runs are comparable: the first row always gets 1.
  // SQL Server quirk: on a table that never held a row, the first insert after RESEED n takes n itself
  // (not n + 1), so only tables that already used their identity are reseeded to 0.
  for (const t of [
    'Role',
    'User',
    'FeeHistory',
    'MatchingRuleSet',
    'MatchingSheetRule',
    'MatchingColumnRule',
    'MatchingRowIgnoreRule',
    'Transaction',
    'ValidationRun',
    'ValidationResult',
    'ValidationIssue',
    'ConflictOccurrence',
    'SettlementBatchFee',
    'SettlementTransaction',
    'SettlementTransactionFee',
    'AuditLog',
  ]) {
    await prisma.$executeRawUnsafe(
      `IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'[dbo].[${t}]') AND last_value IS NOT NULL)
         DBCC CHECKIDENT ('[dbo].[${t}]', RESEED, 0) WITH NO_INFOMSGS`,
    )
  }
}

async function main() {
  const started = Date.now()
  const rng = mulberry32(7)
  log('emptying tables')
  await wipe()

  // ── catalogs ──
  await prisma.cycle.createMany({ data: CYCLES.map((c) => ({ ...c })) })
  await prisma.transactionStatus.createMany({ data: TRANSACTION_STATUSES.map((s) => ({ ...s })) })
  await prisma.settlementStatus.createMany({ data: SETTLEMENT_STATUSES.map((s) => ({ ...s })) })
  await prisma.feeType.createMany({ data: FEE_TYPES })
  log('catalogs')

  // ── gateway hierarchy ──
  await prisma.gateway.createMany({ data: GATEWAYS.map((g) => ({ ...g })) })
  await prisma.merchant.createMany({ data: MERCHANTS.map((m) => ({ ...m })) })
  await prisma.provider.createMany({ data: PROVIDERS.map((p) => ({ ...p })) })
  await prisma.channel.createMany({
    data: CHANNELS.map((c) => ({
      channelId: c.channelId,
      gatewayId: c.gatewayId,
      providerId: c.providerId,
      name: c.name,
      settlementTermDays: c.term,
      rollingReservePct: c.pct,
      rollingReserveDays: c.days,
    })),
  })
  log('gateways, merchants, providers, channels')

  // ── roles and users ──
  const passwordHash = await argon2.hash(process.env.SEED_PASSWORD ?? 'Recon2026!')
  const roleIds = new Map<string, number>()
  for (const r of ROLES) {
    const row = await prisma.role.create({
      data: { name: r.name, permissions: { create: r.permissions.map((permissionCode) => ({ permissionCode })) } },
    })
    roleIds.set(r.name, row.roleId)
  }
  const userIds = new Map<string, number>()
  for (const u of USERS) {
    const row = await prisma.user.create({
      data: {
        userName: u.userName,
        email: u.email,
        displayName: u.displayName,
        passwordHash,
        roleId: roleIds.get(u.role)!,
        merchantScope: u.merchantScope,
        merchants: { create: u.merchants.map((merchantId) => ({ merchantId })) },
      },
    })
    userIds.set(u.userName, row.userId)
  }
  const adminId = userIds.get('admin')!
  const analystId = userIds.get('analyst')!
  const paymentsId = userIds.get('payments')!
  log('roles and users')

  // ── matching rules ──
  await prisma.matchingStatusAlias.createMany({ data: STATUS_ALIASES })
  await prisma.matchingSheetRule.createMany({ data: GLOBAL_SHEET_RULES.map((r) => ({ ...r, ruleSetId: null })) })
  await prisma.matchingColumnRule.createMany({
    data: GLOBAL_COLUMN_RULES.map((r) => ({ ...r, ruleSetId: null, sheetPattern: null })),
  })
  await prisma.matchingRowIgnoreRule.createMany({ data: GLOBAL_ROW_IGNORES.map((r) => ({ ...r, ruleSetId: null })) })
  const legacy = await prisma.matchingRuleSet.create({
    data: {
      providerId: LEGACY_RULE_SET.providerId,
      name: LEGACY_RULE_SET.name,
      sheetRules: { create: LEGACY_RULE_SET.sheetRules },
      columnRules: { create: LEGACY_RULE_SET.columnRules },
    },
  })
  log('matching rules (global + legacy rule set)')

  // ── accounts, fees, channels ──
  const accountIds = new Map<string, string>()
  for (const a of ACCOUNTS) {
    const accountId = uid(rng)
    accountIds.set(a.name, accountId)
    await prisma.account.create({
      data: {
        accountId,
        providerId: a.providerId,
        name: a.name,
        chargebackReservePolicy: a.policy,
        rollingReserveCapAmt: a.cap,
        matchingRuleSetId: a.ruleSet ? legacy.ruleSetId : null,
        createdByUserId: adminId,
      },
    })
    for (const f of ACCOUNT_FEES[a.name] ?? []) {
      const feeId = uid(rng)
      const data = {
        feeId,
        accountId,
        feeTypeId: f.feeTypeId,
        fixedAmount: f.fixed ?? null,
        percentage: f.pct ?? null,
        conditionalPercentage: f.condPct ?? null,
        conditionThresholdAmt: f.threshold ?? null,
        startDate: null,
        endDate: null,
        createdByUserId: adminId,
      }
      await prisma.fee.create({ data })
      await prisma.feeHistory.create({
        data: { feeId, changedByUserId: adminId, action: 'created', afterJson: JSON.stringify(data), reason: 'seed' },
      })
    }
  }
  log('accounts and fees')

  // ── transactions ──
  const world = buildWorld()
  log(`generating ${world.txns.length} transactions`)
  const statusId = (s: StatusCode) => STATUS[s]
  await chunked(world.txns, (rows) =>
    prisma.transaction.createMany({
      data: rows.map((t) => ({
        sourceTransactionId: t.sourceTransactionId,
        gatewayId: t.gatewayId,
        merchantId: t.merchantId,
        providerId: t.providerId,
        channelId: t.channelId,
        orderId: t.orderId,
        amount: t.amount,
        cardBrand: t.cardBrand,
        statusId: statusId(t.status),
        transactionDate: t.transactionDate,
        lastStatusChangedAt: t.lastStatusChangedAt,
        appliedReservePct: t.appliedReservePct,
      })),
    }),
  )
  const idRows: { transactionId: bigint; gatewayId: number; sourceTransactionId: string }[] =
    await prisma.transaction.findMany({ select: { transactionId: true, gatewayId: true, sourceTransactionId: true } })
  const txnId = new Map<string, bigint>(idRows.map((r) => [`${r.gatewayId}|${r.sourceTransactionId}`, r.transactionId]))
  const idOf = (key: string) => {
    const t = world.txnByKey.get(key)!
    return txnId.get(`${t.gatewayId}|${t.sourceTransactionId}`)!
  }
  log('transactions inserted')

  // ── assigned channels (primary = last account that processed a settlement with the channel) ──

  // ── history of paid batches ──
  let nBatches = 0
  for (const plan of world.batches) {
    await insertBatch(world, plan, accountIds.get(plan.account)!, idOf, analystId, paymentsId, rng)
    nBatches++
    if (nBatches % 10 === 0) log(`batches ${nBatches}/${world.batches.length}`)
  }
  for (const c of CHANNELS) {
    if (!c.account) continue
    const accountId = accountIds.get(c.account)!
    const last = await prisma.settlementBatch.findFirst({
      where: { accountId, status: 'paid' },
      orderBy: { processedAt: 'desc' },
    })
    await prisma.accountChannel.create({
      data: {
        accountId,
        channelId: c.channelId,
        isPrimary: true,
        assignedAt: last?.processedAt ?? new Date(),
        assignedInBatchId: last?.batchId ?? null,
        assignedByUserId: analystId,
      },
    })
  }
  log(`history: ${nBatches} paid batches; ${CHANNELS.filter((c) => c.account).length} channels assigned`)

  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: 'seed.run',
      entityType: 'database',
      entityId: 'seed',
      detailJson: JSON.stringify({ txns: world.txns.length, batches: nBatches }),
    },
  })
  log(`done in ${((Date.now() - started) / 1000).toFixed(1)} s`)
}

async function insertBatch(
  world: World,
  plan: BatchPlan,
  accountId: string,
  idOf: (k: string) => bigint,
  analystId: number,
  paymentsId: number,
  rng: () => number,
) {
  const importId = uid(rng)
  const batchId = uid(rng)
  await prisma.import.create({
    data: {
      importId,
      accountId,
      createdByUserId: analystId,
      status: 'processed',
      analyzedAt: plan.processedAt,
      rowsTotal: plan.eKeys.length + plan.iKeys.length + plan.rKeys.length,
      rowsMatched: plan.eKeys.length + plan.iKeys.length + plan.rKeys.length,
      rowsUnmatched: 0,
    },
  })

  type Row = SettlementMovement & { transactionId: bigint }
  const rows: Row[] = settlementMovementsOf(world, plan).map((m) => ({ ...m, transactionId: idOf(m.key) }))

  // Amounts are DECIMAL(19,4) text; sums with Decimal, never with JS numbers.
  const sum = (xs: Row[], f: (r: Row) => string) => xs.reduce((a, r) => a.plus(f(r)), new Decimal(0))
  const E = rows.filter((r) => r.cycle === 'E')
  const I = rows.filter((r) => r.cycle === 'I')
  const R = rows.filter((r) => r.cycle === 'R')
  const cat = (xs: Row[], s: StatusCode) => xs.filter((r) => r.status === s)
  const totals = [
    { category: 'deposit', rows: cat(E, 'Successful') },
    { category: 'declined', rows: cat(E, 'Declined') },
    { category: 'chargeback', rows: cat(I, 'Chargeback') },
    { category: 'refund', rows: cat(I, 'Refund') },
    { category: 'rdr', rows: cat(I, 'RDR') },
  ]
  const deposit = sum(cat(E, 'Successful'), (r) => r.amount)
  const mdrPct = (ACCOUNT_FEES[plan.account] ?? []).find((f) => f.feeTypeId === 1)?.pct ?? 0
  const mdrAmt = amount4(deposit.times(mdrPct))
  const fees = sum(rows, (r) => r.feeAmount)
  const held = sum(E, (r) => r.held)
  const released = sum(R, (r) => r.released)
  // Chargebacks, refunds and RDRs deduct from the merchant (the seeded history has no batch fees nor CHB 2).
  const adjustments = sum(I, (r) => r.amount)
  const amountPayable = deposit.minus(fees).minus(held).plus(released).minus(adjustments)
  const minMax = (xs: Row[]) =>
    xs.length
      ? [
          new Date(Math.min(...xs.map((r) => r.eventDate.getTime()))),
          new Date(Math.max(...xs.map((r) => r.eventDate.getTime()))),
        ]
      : [null, null]
  const [minApp, maxApp] = minMax(cat(E, 'Successful'))
  const [minDec, maxDec] = minMax(cat(E, 'Declined'))
  const [minI, maxI] = minMax(I)

  await prisma.settlementBatch.create({
    data: {
      batchId,
      accountId,
      batchNo: plan.batchNo,
      attemptNo: 1,
      importId,
      status: plan.status,
      approvedByUserId: analystId,
      processedAt: plan.processedAt,
      settlementDate: plan.settlementDate,
      paidAt: plan.paidAt,
      paidByUserId: plan.paidAt ? paymentsId : null,
      dateMinApp: minApp,
      dateMaxApp: maxApp,
      dateMinDec: minDec,
      dateMaxDec: maxDec,
      dateMinI: minI,
      dateMaxI: maxI,
      dateMinR: plan.rWindow?.[0] ?? null,
      dateMaxR: plan.rWindow?.[1] ?? null,
      mdrAmt,
      mdrRate: mdrPct,
      otherFeeAmt: 0,
      reserveHeldAmt: held,
      reserveReleasedAmt: released,
      amountPayable,
      channels: [...new Set(plan.eKeys.map((k) => world.txnByKey.get(k)!.channel))].join(','),
      totals: {
        create: totals.map((t) => ({
          category: t.category,
          qty: t.rows.length,
          amount: sum(t.rows, (r) => r.amount),
          feeAmount: sum(t.rows, (r) => r.feeAmount),
        })),
      },
      brandTotals: {
        create: [...new Set(cat(E, 'Successful').map((r) => r.brand))].map((b) => ({
          cardBrand: b,
          qty: cat(E, 'Successful').filter((r) => r.brand === b).length,
          amount: sum(
            cat(E, 'Successful').filter((r) => r.brand === b),
            (r) => r.amount,
          ),
        })),
      },
    },
  })
  await prisma.import.update({ where: { importId }, data: { currentBatchId: batchId } })
  const settled = plan.status === 'paid' ? 1 : 0
  await chunked(rows, (rs) =>
    prisma.settlementTransaction.createMany({
      data: rs.map((r) => ({
        batchId,
        transactionId: r.transactionId,
        cycle: r.cycle,
        statusId: r.statusId,
        settlementStatusId: settled,
        amount: r.amount,
        feeAmount: r.feeAmount,
        eventDate: r.eventDate,
        appliedReservePct: r.pct,
        reserveDaysUsed: r.days,
        expectedReserveReleaseAt: r.expectedAt,
        reserveHeldAmt: r.held,
        reserveReleasedAmt: r.released,
      })),
    }),
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
