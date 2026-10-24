import type { Decimal } from 'decimal.js';
import type { SourceType } from '../generated/prisma/client.js';
import {
  maskCard,
  maskCellForStorage,
  normalizeText,
  parseAmount,
  parseDate,
  type DecimalSeparator,
  type RawCell,
} from './normalizers/index.js';

export interface RowError {
  row: number;
  field: string;
  reason: string;
}

export interface TransformOptions {
  sourceType: SourceType;
  /** Campo estándar → índice de columna. */
  mapping: ReadonlyMap<string, number>;
  dateFormat: string;
  decimalSeparator: DecimalSeparator;
  headers: readonly string[];
}

export interface PosData {
  transactionAt: Date;
  amount: Decimal;
  cardLast4: string | null;
  authCode: string | null;
  cardBrand: string | null;
  batchNumber: string | null;
  terminalId: string | null;
  storeCode: string | null;
  reference: string | null;
}

export interface BankData {
  postedAt: Date;
  valueDate: Date | null;
  amount: Decimal;
  grossAmount: Decimal | null;
  feeAmount: Decimal | null;
  withholdingAmount: Decimal | null;
  description: string | null;
  reference: string | null;
  batchNumber: string | null;
  authCode: string | null;
  cardLast4: string | null;
  storeCode: string | null;
}

export type RowResult =
  | { kind: 'ok'; rowNumber: number; data: PosData | BankData; rawData: Record<string, RawCell> }
  | { kind: 'discarded'; rowNumber: number }
  | { kind: 'error'; rowNumber: number; errors: RowError[] };

/** Valores de la columna de tipo que identifican un débito (comparación sin acentos). */
export const DEBIT_TYPES: ReadonlySet<string> = new Set([
  'D',
  'DB',
  'DEBITO',
  'DEBIT',
  'CARGO',
  'DR',
]);

const stripAccents = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '');

export function isDebitType(value: RawCell): boolean {
  const normalized = normalizeText(value);
  return normalized !== null && DEBIT_TYPES.has(stripAccents(normalized));
}

const isEmpty = (cell: RawCell) =>
  cell === null || cell === undefined || String(cell).trim() === '';

/** Transforma una fila del archivo al formato estándar. Es pura: no toca BD ni framework. */
export function transformRow(
  rowNumber: number,
  rawCells: readonly RawCell[],
  options: TransformOptions,
): RowResult {
  // Enmascarado antes de cualquier uso: ni el valor mapeado ni la fila original ven un PAN
  const cells = rawCells.map(maskCellForStorage);
  const cell = (field: string): RawCell => {
    const index = options.mapping.get(field);
    return index === undefined ? null : (cells[index] ?? null);
  };
  const errors: RowError[] = [];
  const fail = (field: string, reason: string) => errors.push({ row: rowNumber, field, reason });

  const requiredDate = (field: string): Date | null => {
    const date = parseDate(cell(field), options.dateFormat);
    if (!date) fail(field, 'Fecha inválida');
    return date;
  };
  const requiredAmount = (field: string): Decimal | null => {
    const amount = parseAmount(cell(field), options.decimalSeparator);
    if (!amount) fail(field, 'Monto inválido');
    return amount;
  };
  const optionalAmount = (field: string): Decimal | null => {
    if (isEmpty(cell(field))) return null;
    const amount = parseAmount(cell(field), options.decimalSeparator);
    if (!amount) fail(field, 'Monto inválido');
    return amount;
  };
  const text = (field: string) => normalizeText(cell(field));

  const rawData: Record<string, RawCell> = {};
  options.headers.forEach((header, index) => {
    rawData[header] = cells[index] ?? null;
  });

  if (options.sourceType === 'POS') {
    const transactionAt = requiredDate('transactionAt');
    const amount = requiredAmount('amount');
    if (errors.length > 0 || !transactionAt || !amount) {
      return { kind: 'error', rowNumber, errors };
    }
    const data: PosData = {
      transactionAt,
      amount,
      cardLast4: maskCard(cell('cardLast4')),
      authCode: text('authCode'),
      cardBrand: text('cardBrand'),
      batchNumber: text('batchNumber'),
      terminalId: text('terminalId'),
      storeCode: text('storeCode'),
      reference: text('reference'),
    };
    return { kind: 'ok', rowNumber, data, rawData };
  }

  const postedAt = requiredDate('postedAt');
  let valueDate: Date | null = null;
  if (!isEmpty(cell('valueDate'))) {
    valueDate = parseDate(cell('valueDate'), options.dateFormat);
    if (!valueDate) fail('valueDate', 'Fecha inválida');
  }
  const amount = requiredAmount('amount');
  const grossAmount = optionalAmount('grossAmount');
  const feeAmount = optionalAmount('feeAmount');
  const withholdingAmount = optionalAmount('withholdingAmount');
  if (errors.length > 0 || !postedAt || !amount) {
    return { kind: 'error', rowNumber, errors };
  }

  // Los extractos solo interesan por sus créditos: se descartan los débitos
  const type = cell('movementType');
  const debit = isEmpty(type) ? amount.isNegative() : isDebitType(type);
  if (debit) return { kind: 'discarded', rowNumber };

  const description = cell('description');
  const data: BankData = {
    postedAt,
    valueDate,
    amount,
    grossAmount,
    feeAmount,
    withholdingAmount,
    description: isEmpty(description) ? null : String(description).trim(),
    reference: text('reference'),
    batchNumber: text('batchNumber'),
    authCode: text('authCode'),
    cardLast4: maskCard(cell('cardLast4')),
    storeCode: text('storeCode'),
  };
  return { kind: 'ok', rowNumber, data, rawData };
}
