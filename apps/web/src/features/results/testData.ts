import type { BankTx, MatchView, PosTx, Summary } from './api';

export const pos = (id: string, amount: string, over: Partial<PosTx> = {}): PosTx => ({
  id,
  rowNumber: Number(id.replace(/\D/g, '')) || 1,
  transactionAt: '2026-09-01T10:00:00.000Z',
  amount,
  cardLast4: null,
  authCode: null,
  cardBrand: 'VISA',
  batchNumber: 'L1',
  reference: `R-${id}`,
  storeCode: 'ALM. UNO',
  status: 'PENDING',
  rawData: { Fecha: '01/09/2026', Monto: amount },
  ...over,
});

export const bank = (id: string, amount: string, over: Partial<BankTx> = {}): BankTx => ({
  id,
  rowNumber: Number(id.replace(/\D/g, '')) || 1,
  postedAt: '2026-09-02',
  valueDate: null,
  amount,
  grossAmount: null,
  cardLast4: null,
  authCode: null,
  batchNumber: '1',
  reference: `B-${id}`,
  storeCode: '450404',
  description: null,
  status: 'PENDING',
  rawData: {},
  ...over,
});

export const match = (id: string, over: Partial<MatchView> = {}): MatchView => ({
  id,
  method: 'EXACT',
  cardinality: 'ONE_TO_ONE',
  status: 'CONFIRMED',
  confidence: 1,
  posTotal: '100.00',
  bankTotal: '100.00',
  difference: '0.00',
  explanation: 'Mismo local, lote y referencia',
  createdBy: null,
  confirmedBy: null,
  createdAt: '2026-09-05T10:00:00.000Z',
  confirmedAt: null,
  posTransactions: [pos('p1', '100.00')],
  bankMovements: [bank('b1', '100.00')],
  ...over,
});

export const summary = (over: Partial<Summary> = {}): Summary => ({
  posCount: 1205,
  posTotal: '98000.50',
  bankCount: 974,
  bankTotal: '90000.00',
  matchedByMethod: { EXACT: 720, TOLERANCE: 180 },
  matchedPos: 900,
  matchedBank: 900,
  pendingPos: 305,
  pendingPosTotal: '1200.00',
  pendingBank: 74,
  pendingBankTotal: '800.00',
  proposed: 3,
  exceptions: 1,
  matchedPercent: 74.7,
  totalDifference: '-15.25',
  ...over,
});

export const page = <T>(items: T[], total = items.length, pageNo = 1) => ({
  items,
  total,
  page: pageNo,
  pageSize: 25,
});

export const json = (body: unknown, status = 200) =>
  Promise.resolve(
    status === 204
      ? new Response(null, { status })
      : new Response(JSON.stringify(body), { status }),
  );
