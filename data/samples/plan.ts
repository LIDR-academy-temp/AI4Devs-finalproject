/**
 * Builds the sample files plan from the synthetic world (same seed as the database)
 * and writes it as JSON. `build-samples.py` converts that JSON into the .xlsx files
 * in the standardized template format and into the expected.json files.
 *
 *   pnpm tsx data/samples/plan.ts > data/samples/plan.json
 *
 * Rules it reproduces (README §1.2, §3.3, doc 05): only ID is mandatory; amounts always
 * positive; RR.Amount = released reserve; IDs as text; several files per batch.
 */
import {
  ACCOUNT_FEES,
  ANCHOR,
  type BatchPlan,
  buildWorld,
  CHANNELS,
  day,
  feeFor,
  iso,
  money,
  mulberry32,
  NEW_CHANNEL_FOR,
  type Txn,
} from '../../backend/prisma/synthetic.js'

type Cell = string | number | null
type Row = Cell[]
interface SheetDef {
  columns: string[]
  rows: Row[]
}
interface FileDef {
  fileName: string
  sheets: Record<string, SheetDef>
}
interface Sample {
  name: string
  account: string
  batchNo: number
  description: string
  files: FileDef[]
  expected: Record<string, unknown>
}

const world = buildWorld()
const rng = mulberry32(99)
const chan = (id: number) => CHANNELS.find((c) => c.channelId === id)!
const accountChannels = (account: string) => CHANNELS.filter((c) => c.account === account).map((c) => c.channelId)
const T = (k: string) => world.txnByKey.get(k)!
const tx = (t: Txn, amount: number | null = t.amount): Row => [
  t.sourceTransactionId,
  amount,
  amount === null ? null : 'USD',
]
const rr = (t: Txn): Row => [t.sourceTransactionId, money(t.amount * t.appliedReservePct), 'USD']
const SUM_ROW: Row = ['', 0, null] // leftover =SUM() from the template: empty ID ⇒ ignored

function baseSheets(plan: BatchPlan, opts: { includeNewChannelAdjustments?: boolean } = {}) {
  const own = new Set(accountChannels(plan.account))
  const E = plan.eKeys.map(T)
  const I = plan.iKeys.map(T).filter((t) => opts.includeNewChannelAdjustments || own.has(t.channelId))
  const R = plan.rKeys.map(T)
  return {
    APP: E.filter((t) => t.status !== 'Declined'),
    DEC: E.filter((t) => t.status === 'Declined'),
    CHB: I.filter((t) => t.status === 'Chargeback'),
    REF: I.filter((t) => t.status === 'Refund'),
    RDR: I.filter((t) => t.status === 'RDR'),
    RR: R,
  }
}

function templateSheets(s: ReturnType<typeof baseSheets>, otherFees: Row[]): Record<string, SheetDef> {
  const cols = ['ID', 'Amount', 'Currency']
  return {
    APP: { columns: cols, rows: s.APP.map((t) => tx(t)) },
    DEC: { columns: cols, rows: s.DEC.map((t) => tx(t)) },
    CHB: { columns: cols, rows: [...s.CHB.map((t) => tx(t)), SUM_ROW] },
    REF: { columns: cols, rows: [...s.REF.map((t) => tx(t)), SUM_ROW] },
    RDR: { columns: cols, rows: [...s.RDR.map((t) => tx(t)), SUM_ROW] },
    RR: { columns: cols, rows: s.RR.map(rr) },
    'Duplicate Corrections': { columns: ['ID', 'Status', 'Amount'], rows: [] },
    'CHB Alerts': { columns: ['ID', 'Type of Fee'], rows: [] },
    'Other Fees': { columns: ['Type of Fee', 'Amount', 'Currency'], rows: otherFees },
  }
}

/** Expected Settlement Summary totals for a hold_until_term account with no issues. */
function totals(account: string, s: ReturnType<typeof baseSheets>) {
  const sum = (xs: number[]) => money(xs.reduce((a, b) => a + b, 0))
  const deposit = sum(s.APP.map((t) => t.amount))
  const mdrPct = (ACCOUNT_FEES[account] ?? []).find((f) => f.feeTypeId === 1)?.pct ?? 0
  const fee = (xs: Txn[], st: Txn['status'], cyc: 'E' | 'I') => sum(xs.map((t) => feeFor(account, st, t.amount, cyc)))
  const fees = {
    deposit: fee(s.APP, 'Successful', 'E'),
    declined: fee(s.DEC, 'Declined', 'E'),
    chargeback: fee(s.CHB, 'Chargeback', 'I'),
    refund: fee(s.REF, 'Refund', 'I'),
    rdr: fee(s.RDR, 'RDR', 'I'),
  }
  const held = sum(s.APP.map((t) => money(t.amount * t.appliedReservePct)))
  const released = sum(s.RR.map((t) => money(t.amount * t.appliedReservePct)))
  const adjustments = sum([...s.CHB, ...s.REF].map((t) => t.amount))
  const totalFees = sum(Object.values(fees))
  return {
    qty: {
      deposit: s.APP.length,
      declined: s.DEC.length,
      chargeback: s.CHB.length,
      refund: s.REF.length,
      rdr: s.RDR.length,
      reservesReleased: s.RR.length,
    },
    amounts: {
      deposit,
      chargeback: sum(s.CHB.map((t) => t.amount)),
      refund: sum(s.REF.map((t) => t.amount)),
      reserveHeld: held,
      reserveReleased: released,
    },
    fees: { ...fees, mdrIncludedInDeposit: money(deposit * mdrPct), total: totalFees },
    amountPayable: money(deposit - totalFees - held + released - adjustments),
  }
}

const ranges = (s: ReturnType<typeof baseSheets>) => {
  const r = (xs: Txn[], f: (t: Txn) => Date) =>
    xs.length
      ? [
          iso(new Date(Math.min(...xs.map((t) => f(t).getTime())))),
          iso(new Date(Math.max(...xs.map((t) => f(t).getTime())))),
        ]
      : null
  return {
    APP: r(s.APP, (t) => t.transactionDate),
    DEC: r(s.DEC, (t) => t.transactionDate),
    I: r([...s.CHB, ...s.REF, ...s.RDR], (t) => t.lastStatusChangedAt!),
    // R by expiry date: creation + rollingReserveDays of the transaction's channel.
    R: r(s.RR, (t) => day(t.transactionDate, chan(t.channelId).days)),
  }
}

const samples: Sample[] = []

// ───────── 1. batch-clean (ProviderA-USD) ─────────
{
  const plan = world.sampleBatch['ProviderA-USD']!
  const s = baseSheets(plan)
  const newChannels = [
    ...new Set(
      [...s.APP, ...s.DEC]
        .filter((t) => NEW_CHANNEL_FOR[chan(t.channelId).name] === plan.account)
        .map((t) => chan(t.channelId).name),
    ),
  ]
  const otherFees: Row[] = [
    ['Wire Fee', 25, 'USD'],
    ['Settlement Fee', 15, 'USD'],
  ]
  samples.push({
    name: 'batch-clean',
    account: plan.account,
    batchNo: plan.batchNo,
    description: 'Batch completo sin incidencias, en un solo archivo con el formato de la plantilla.',
    files: [{ fileName: 'Recon_Template_ProviderA-USD_batch-clean.xlsx', sheets: templateSheets(s, otherFees) }],
    expected: {
      import: {
        files: 1,
        sheets: {
          transactions: ['APP', 'DEC', 'CHB', 'REF', 'RDR', 'RR'],
          batch_fees: ['Other Fees'],
          ignored: ['Duplicate Corrections', 'CHB Alerts', 'Settings'],
        },
      },
      rows: {
        read: s.APP.length + s.DEC.length + s.CHB.length + s.REF.length + s.RDR.length + s.RR.length + 3,
        ignoredEmptyId: 3,
        matched: s.APP.length + s.DEC.length + s.CHB.length + s.REF.length + s.RDR.length + s.RR.length,
        unmatched: 0,
        ambiguous: 0,
      },
      byCycle: { E: s.APP.length + s.DEC.length, I: s.CHB.length + s.REF.length + s.RDR.length, R: s.RR.length },
      ranges: ranges(s),
      warnings: { newChannels, nonUsdCurrency: 0, negativeAmounts: 0, unknownFeeTypes: [] },
      validations: {
        provider_mismatch: 0,
        non_recorded_adjustment: { non_recorded_adjustment: 0, status_mismatch: 0 },
        duplicate_in_batch: 0,
        status_collision_in_batch: 0,
        duplicate_across_batches: 0,
        status_collision_across_batches: 0,
        missing_previous_to_batch: { E: 0, I: 0, R: 0 },
        missing_in_range: { E: 0, I: 0, R: 0 },
      },
      batchFeesPrefilled: otherFees.map(([type, amount]) => ({ feeType: type, amount })),
      proposedBatchNo: plan.batchNo,
      summary: totals(plan.account, s),
    },
  })

  // ───────── 2. batch-split (same batch, two files) ─────────
  const all = templateSheets(s, otherFees)
  const part1: FileDef = {
    fileName: 'Recon_Template_ProviderA-USD_batch-split_part1.xlsx',
    sheets: {
      APP: all.APP!,
      DEC: all.DEC!,
      CHB: { columns: all.CHB!.columns, rows: [] },
      REF: { columns: all.REF!.columns, rows: [] },
      RDR: { columns: all.RDR!.columns, rows: [] },
      RR: { columns: all.RR!.columns, rows: [] },
      'Duplicate Corrections': all['Duplicate Corrections']!,
      'CHB Alerts': all['CHB Alerts']!,
      'Other Fees': { columns: all['Other Fees']!.columns, rows: [] },
    },
  }
  const part2: FileDef = {
    fileName: 'Recon_Template_ProviderA-USD_batch-split_part2.xlsx',
    sheets: {
      APP: { columns: all.APP!.columns, rows: [] },
      DEC: { columns: all.DEC!.columns, rows: [] },
      CHB: all.CHB!,
      REF: all.REF!,
      RDR: all.RDR!,
      RR: all.RR!,
      'Duplicate Corrections': all['Duplicate Corrections']!,
      'CHB Alerts': all['CHB Alerts']!,
      'Other Fees': all['Other Fees']!,
    },
  }
  const clean = samples[samples.length - 1]!
  samples.push({
    name: 'batch-split',
    account: plan.account,
    batchNo: plan.batchNo,
    description:
      'El mismo batch que batch-clean repartido en dos archivos (E en part1; I, R y fees en part2). Los totales deben coincidir con batch-clean.',
    files: [part1, part2],
    expected: {
      ...clean.expected,
      import: { ...(clean.expected.import as object), files: 2 },
      sameResultAs: 'batch-clean',
    },
  })
}

// ───────── 3. batch-issues (ProviderB-Main) ─────────
{
  const plan = world.sampleBatch['ProviderB-Main']!
  const prev = world.batches.filter((b) => b.account === plan.account).at(-1)!
  const s = baseSheets(plan)
  const own = new Set(accountChannels(plan.account))
  const APP = [...s.APP]
  const DEC = [...s.DEC]
  const CHB = [...s.CHB]
  const REF = [...s.REF]
  const RR = [...s.RR]
  const notes: Record<string, unknown> = {}

  // duplicate_in_batch: one approved txn repeated
  const dup = APP[10]!
  const appRows: Row[] = APP.map((t) => tx(t))
  appRows.push(tx(dup))
  notes.duplicate_in_batch = [dup.sourceTransactionId]

  // status_collision_in_batch: one approved txn also in DEC
  const col = APP[20]!
  const decRows: Row[] = DEC.filter((t) => iso(t.transactionDate) !== iso(plan.eWindow[0])) // previous_to_batch: the first day's DEC rows are omitted
    .map((t) => tx(t))
  decRows.push(tx(col))
  notes.status_collision_in_batch = [col.sourceTransactionId]
  const decOmitted = DEC.filter((t) => iso(t.transactionDate) === iso(plan.eWindow[0]) && own.has(t.channelId))
  notes.missing_previous_to_batch_DEC = decOmitted.map((t) => t.sourceTransactionId)

  // duplicate_across_batches: one approved txn from the previous batch again in APP
  const prevApp = prev.eKeys.map(T).filter((t) => t.status !== 'Declined' && own.has(t.channelId))
  const dupAcross = prevApp[5]!
  appRows.push(tx(dupAcross))
  notes.duplicate_across_batches = [dupAcross.sourceTransactionId]

  // status_collision_across_batches: one approved txn from the previous batch now as DEC
  const colAcross = prevApp[6]!
  decRows.push(tx(colAcross))
  notes.status_collision_across_batches = [colAcross.sourceTransactionId]

  // status_mismatch: both DEC rows above are Successful in the gateway (file Declined vs gateway Successful)
  notes.status_mismatch = [col.sourceTransactionId, colAcross.sourceTransactionId]

  // non_recorded_adjustment: chargeback from a new channel (RAM-13) whose approved txn was never settled
  const newChTxns = [...s.APP].filter((t) => NEW_CHANNEL_FOR[chan(t.channelId).name] === plan.account)
  const nra = newChTxns[0]!
  const chbRows: Row[] = CHB.map((t) => tx(t))
  chbRows.push(tx(nra))
  notes.non_recorded_adjustment = [nra.sourceTransactionId]

  // missing_in_range E: three approved txns from intermediate days omitted from the file
  const mid = APP.filter(
    (t) =>
      own.has(t.channelId) &&
      iso(t.transactionDate) > iso(plan.eWindow[0]) &&
      iso(t.transactionDate) < iso(plan.eWindow[1]),
  )
  const missE = [mid[3]!, mid[40]!, mid[80]!]
  const missSet = new Set(missE.map((t) => t.key))
  // the new channel's approved txn that goes in CHB is removed from APP: its E was never settled (non_recorded_adjustment)
  const appRowsFinal = appRows.filter(
    (r) => !missE.some((t) => t.sourceTransactionId === r[0]) && r[0] !== nra.sourceTransactionId,
  )
  notes.missing_in_range_E = missE.map((t) => t.sourceTransactionId)

  // missing_in_range R: three expired reserves omitted from RR (from the middle of the range)
  const rSorted = [...RR].sort((a, b) => a.transactionDate.getTime() - b.transactionDate.getTime())
  const missR = [
    rSorted[Math.floor(rSorted.length / 3)]!,
    rSorted[Math.floor(rSorted.length / 2)]!,
    rSorted[Math.floor((2 * rSorted.length) / 3)]!,
  ]
  const rrRows: Row[] = rSorted.filter((t) => !missR.includes(t)).map(rr)
  notes.missing_in_range_R = missR.map((t) => t.sourceTransactionId)

  // unmatched: non-existent 16-digit ID
  const bogus = `4${String(Math.floor(rng() * 1e15)).padStart(15, '0')}`
  appRowsFinal.push([bogus, 120, 'USD'])
  notes.unmatched = [bogus]

  // negative amount (warning) in REF
  const refRows: Row[] = REF.map((t, i) => (i === 0 ? tx(t, -t.amount) : tx(t)))
  notes.negativeAmount = REF.length ? [REF[0]!.sourceTransactionId] : []

  // leftover =SUM
  chbRows.push(SUM_ROW)
  refRows.push(SUM_ROW)

  const otherFees: Row[] = [
    ['Wire Fee', 25, 'USD'],
    ['Fraud Monitoring Fee', 99, 'USD'],
  ]
  const newChannels = [
    ...new Set(
      [...APP, ...DEC]
        .filter((t) => NEW_CHANNEL_FOR[chan(t.channelId).name] === plan.account)
        .map((t) => chan(t.channelId).name),
    ),
  ]
  const sheets: Record<string, SheetDef> = {
    APP: { columns: ['ID', 'Amount', 'Currency'], rows: appRowsFinal },
    DEC: { columns: ['ID', 'Amount', 'Currency'], rows: decRows },
    CHB: { columns: ['ID', 'Amount', 'Currency'], rows: chbRows },
    REF: { columns: ['ID', 'Amount', 'Currency'], rows: refRows },
    RDR: { columns: ['ID', 'Amount', 'Currency'], rows: [...s.RDR.map((t) => tx(t)), SUM_ROW] },
    RR: { columns: ['ID', 'Amount', 'Currency'], rows: rrRows },
    'Duplicate Corrections': { columns: ['ID', 'Status', 'Amount'], rows: [] },
    'CHB Alerts': { columns: ['ID', 'Type of Fee'], rows: [] },
    'Other Fees': { columns: ['Type of Fee', 'Amount', 'Currency'], rows: otherFees },
  }
  const countRows = (k: string) => sheets[k]!.rows.filter((r) => r[0] !== '').length
  // rows.read counts the transaction sheets only (as batch-clean does): Other Fees rows are batch fees, not rows to match.
  const totalRows = ['APP', 'DEC', 'CHB', 'REF', 'RDR', 'RR'].reduce((a, k) => a + sheets[k]!.rows.length, 0)
  samples.push({
    name: 'batch-issues',
    account: plan.account,
    batchNo: plan.batchNo,
    description:
      'Batch con una incidencia de cada tipo no bloqueante, un canal nuevo, un ID desconocido, un importe negativo y un tipo de fee fuera de catálogo.',
    files: [{ fileName: 'Recon_Template_ProviderB-Main_batch-issues.xlsx', sheets }],
    expected: {
      import: { files: 1 },
      rows: { read: totalRows, ignoredEmptyId: 3, matched: totalRows - 3 - 1, unmatched: 1, ambiguous: 0 },
      byCycle: {
        E: countRows('APP') + countRows('DEC'),
        I: countRows('CHB') + countRows('REF') + countRows('RDR'),
        R: countRows('RR'),
      },
      warnings: { newChannels, negativeAmounts: 1, unknownFeeTypes: ['Fraud Monitoring Fee'] },
      validations: {
        provider_mismatch: 0,
        non_recorded_adjustment: {
          non_recorded_adjustment: (notes.non_recorded_adjustment as string[]).length,
          status_mismatch: (notes.status_mismatch as string[]).length,
        },
        duplicate_in_batch: 1,
        status_collision_in_batch: 1,
        duplicate_across_batches: 1,
        status_collision_across_batches: 1,
        missing_previous_to_batch: { E: decOmitted.length, I: 0, R: 0 },
        missing_in_range: { E: missE.length, I: 0, R: missR.length },
      },
      defaults: {
        duplicate_in_batch: 'first occurrence included, second excluded',
        duplicate_across_batches: 'current excluded',
        status_collision_in_batch: 'both included',
        status_collision_across_batches: 'current included',
        non_recorded_adjustment: 'included',
        status_mismatch: 'included',
      },
      affectedIds: notes,
      batchFeesPrefilled: otherFees.map(([type, amount]) => ({ feeType: type, amount })),
      proposedBatchNo: plan.batchNo,
      note: 'Los totales del summary dependen de las decisiones de inclusión y de la política release_on_chargeback de la cuenta; no se fijan aquí.',
    },
  })
  void missSet

  // ───────── 4. batch-blocked (provider_mismatch) ─────────
  const foreign = world.txns.find(
    (t) => chan(t.channelId).name === 'RAM-01' && t.status === 'Successful' && t.transactionDate >= plan.eWindow[0],
  )!
  const small = APP.filter((t) => own.has(t.channelId)).slice(0, 20)
  samples.push({
    name: 'batch-blocked',
    account: plan.account,
    batchNo: plan.batchNo,
    description:
      'Archivo con una transacción de un canal de otro proveedor: provider_mismatch, la única validación bloqueante.',
    files: [
      {
        fileName: 'Recon_Template_ProviderB-Main_batch-blocked.xlsx',
        sheets: {
          APP: { columns: ['ID', 'Amount', 'Currency'], rows: [...small.map((t) => tx(t)), tx(foreign)] },
          DEC: { columns: ['ID', 'Amount', 'Currency'], rows: [] },
          CHB: { columns: ['ID', 'Amount', 'Currency'], rows: [] },
          REF: { columns: ['ID', 'Amount', 'Currency'], rows: [] },
          RDR: { columns: ['ID', 'Amount', 'Currency'], rows: [] },
          RR: { columns: ['ID', 'Amount', 'Currency'], rows: [] },
          'Other Fees': { columns: ['Type of Fee', 'Amount', 'Currency'], rows: [] },
        },
      },
    ],
    expected: {
      rows: { read: 21, matched: 21, unmatched: 0 },
      validations: { provider_mismatch: 1 },
      blocked: true,
      affectedIds: { provider_mismatch: [foreign.sourceTransactionId], foreignChannel: 'RAM-01' },
      note: 'No hay override: el analista cancela el import y procesa con el proveedor correcto.',
    },
  })
}

// ───────── 5. legacy-provider (ProviderC-Alt, UUID gateway, provider rule set) ─────────
{
  const plan = world.sampleBatch['ProviderC-Alt']!
  const s = baseSheets(plan)
  const trx: Row[] = [...s.APP.map((t) => [t.sourceTransactionId, 'Successful', t.amount] as Row)]
  const fail: Row[] = s.DEC.map((t) => [t.sourceTransactionId, 'Failed', t.amount] as Row)
  const cb: Row[] = s.CHB.map((t, i) => [t.sourceTransactionId, i === 0 ? 'CHB 2' : 'CHB', t.amount] as Row)
  // the CB sheet carries chargebacks only: the window's refunds and RDRs are omitted; those whose status change
  // precedes the I range (built from the CB rows) are missing_previous_to_batch, later ones are out of range
  const iMin = Math.min(...s.CHB.map((t) => t.lastStatusChangedAt!.getTime()))
  const missPrevI = [...s.REF, ...s.RDR].filter((t) => t.lastStatusChangedAt!.getTime() < iMin)
  samples.push({
    name: 'legacy-provider',
    account: plan.account,
    batchNo: plan.batchNo,
    description:
      'Archivo con nombres de hoja y columna antiguos (TRX / Fail / CB / Summary, Merchant Order No#, Order Status) resuelto por el conjunto de reglas "Provider C legacy"; gateway UUID; un CHB 2 con importe excluido.',
    files: [
      {
        fileName: 'Legacy_ProviderC-Alt_batch.xlsx',
        sheets: {
          Summary: {
            columns: ['Batch', 'Total'],
            rows: [[`Batch ${plan.batchNo}`, money(s.APP.reduce((a, t) => a + t.amount, 0))]],
          },
          TRX: { columns: ['Merchant Order No#', 'Order Status', 'Amount USD'], rows: trx },
          Fail: { columns: ['Merchant Order No#', 'Order Status', 'Amount USD'], rows: fail },
          CB: { columns: ['Merchant Order No#', 'Order Status', 'Amount USD'], rows: cb },
        },
      },
    ],
    expected: {
      ruleSet: 'Provider C legacy',
      sheets: {
        TRX: { kind: 'transactions', cycle: 'E', statusBy: 'column' },
        Fail: { kind: 'transactions', cycle: 'E', status: 'Declined' },
        CB: { kind: 'transactions', cycle: 'I', statusBy: 'column' },
        Summary: { kind: 'ignore' },
      },
      columns: { 'Merchant Order No#': 'transactionId', 'Order Status': 'status', 'Amount USD': 'amount' },
      rows: { read: trx.length + fail.length + cb.length, matched: trx.length + fail.length + cb.length, unmatched: 0 },
      byCycle: { E: trx.length + fail.length, I: cb.length, R: 0 },
      statusAliases: { Failed: 'Declined', CHB: 'Chargeback', 'CHB 2': 'Chargeback (excludeAmount)' },
      excludeAmountRows: cb.length ? [cb[0]![0]] : [],
      validations: {
        provider_mismatch: 0,
        non_recorded_adjustment: { non_recorded_adjustment: 0, status_mismatch: 0 },
        duplicate_in_batch: 0,
        status_collision_in_batch: 0,
        duplicate_across_batches: 0,
        status_collision_across_batches: 0,
        missing_previous_to_batch: { E: 0, I: missPrevI.length, R: 0 },
        missing_in_range: { E: 0, I: 0, R: 0 },
      },
      affectedIds: { missing_previous_to_batch_I: missPrevI.map((t) => t.sourceTransactionId) },
      fees: 'La cuenta se creó sin fees: todos los fees transaccionales son 0 y el summary lo muestra como advertencia.',
      proposedBatchNo: plan.batchNo,
    },
  })
}

process.stdout.write(
  JSON.stringify({ generatedFrom: 'backend/prisma/synthetic.ts', anchorDate: iso(ANCHOR), samples }, null, 1),
)
void day
