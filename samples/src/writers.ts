import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'csv-stringify/sync';
import * as XLSX from 'xlsx';
import type { BankRow, Dataset, PosRow } from './types';

export const POS_HEADERS = [
  'Fecha',
  'Hora',
  'Local',
  'Terminal',
  'Lote',
  'Autorizacion',
  'Tarjeta',
  'Marca',
  'Monto',
  'Referencia',
] as const;

export const BANK_HEADERS = [
  'Fecha Contable',
  'Fecha Valor',
  'Descripcion',
  'Referencia',
  'Lote',
  'Autorizacion',
  'Tarjeta',
  'Monto Bruto',
  'Comision',
  'Retencion',
  'Monto',
  'Tipo',
] as const;

/** Fecha fija en los metadatos del XLSX para que la salida sea reproducible byte a byte. */
const FIXED_DATE = new Date(Date.UTC(2026, 0, 1));

export function posToRecords(rows: PosRow[]): string[][] {
  return rows.map((r) => [
    r.date,
    r.time,
    r.storeCode,
    r.terminalId,
    r.batchNumber,
    r.authCode,
    r.card,
    r.brand,
    r.amount,
    r.reference,
  ]);
}

export function bankToRecords(rows: BankRow[]): string[][] {
  return rows.map((r) => [
    r.postedAt,
    r.valueDate,
    r.description,
    r.reference,
    r.batchNumber,
    r.authCode,
    r.card,
    r.grossAmount,
    r.feeAmount,
    r.withholdingAmount,
    r.amount,
    r.type,
  ]);
}

export function toCsv(headers: readonly string[], records: string[][], delimiter: string): string {
  return stringify([[...headers], ...records], { delimiter, record_delimiter: '\n' });
}

export function toXlsx(headers: readonly string[], records: string[][], sheetName: string): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet([[...headers], ...records]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  workbook.Props = { Title: sheetName, CreatedDate: FIXED_DATE, ModifiedDate: FIXED_DATE };
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', compression: true }) as Buffer;
}

export interface WrittenFiles {
  posCsv: string;
  posXlsx: string;
  bankCsv: string;
  bankXlsx: string;
  expected: string;
}

/** Escribe pos.csv, pos.xlsx, bank.csv, bank.xlsx y expected.json en el directorio indicado. */
export function writeDataset(dataset: Dataset, outDir: string): WrittenFiles {
  mkdirSync(outDir, { recursive: true });
  const { pos, bank } = dataset.expected.formats;
  const posRecords = posToRecords(dataset.pos);
  const bankRecords = bankToRecords(dataset.bank);

  const files: WrittenFiles = {
    posCsv: join(outDir, 'pos.csv'),
    posXlsx: join(outDir, 'pos.xlsx'),
    bankCsv: join(outDir, 'bank.csv'),
    bankXlsx: join(outDir, 'bank.xlsx'),
    expected: join(outDir, 'expected.json'),
  };
  writeFileSync(files.posCsv, toCsv(POS_HEADERS, posRecords, pos.delimiter));
  writeFileSync(files.posXlsx, toXlsx(POS_HEADERS, posRecords, 'Ventas'));
  writeFileSync(files.bankCsv, toCsv(BANK_HEADERS, bankRecords, bank.delimiter));
  writeFileSync(files.bankXlsx, toXlsx(BANK_HEADERS, bankRecords, 'Extracto'));
  writeFileSync(files.expected, JSON.stringify(dataset.expected, null, 2) + '\n');
  return files;
}
