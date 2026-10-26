import type { Decimal } from 'decimal.js';

/** Venta del POS tal como la ve el motor. Las fechas son días `YYYY-MM-DD`. */
export interface PosTxn {
  id: string;
  date: string;
  amount: Decimal;
  cardLast4: string | null;
  authCode: string | null;
  batchNumber: string | null;
  reference: string | null;
  /** Código de establecimiento del banco equivalente al local del POS (tabla de relación) */
  bankStoreCode: string | null;
}

/** Abono del extracto bancario. `amount` es lo acreditado (neto); `grossAmount` el bruto si se conoce. */
export interface BankMov {
  id: string;
  date: string;
  amount: Decimal;
  grossAmount: Decimal | null;
  cardLast4: string | null;
  authCode: string | null;
  batchNumber: string | null;
  reference: string | null;
  storeCode: string | null;
}

export interface UnmatchedPool {
  pos: PosTxn[];
  bank: BankMov[];
}

export interface EngineConfig {
  dateWindowDays: number;
  amountTolerance: number;
  feePercent: number;
  withholdingPercent: number;
}

export type CandidateMethod = 'EXACT' | 'TOLERANCE';

export interface MatchCandidate {
  method: CandidateMethod;
  cardinality: 'ONE_TO_ONE';
  status: 'CONFIRMED' | 'PROPOSED';
  confidence: number;
  posIds: string[];
  bankIds: string[];
  posTotal: Decimal;
  bankTotal: Decimal;
  /** bankTotal − posTotal */
  difference: Decimal;
  explanation: string;
}

export interface MatchingStrategy {
  readonly name: string;
  run(pool: UnmatchedPool, config: EngineConfig): MatchCandidate[];
}
