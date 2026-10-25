import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

export const ROOT = path.resolve(import.meta.dirname, '../../../..');

/** Mapeo de columnas de samples/standard/pos.csv */
export const POS_MAPPING = {
  '0': 'transactionAt',
  '2': 'storeCode',
  '3': 'terminalId',
  '4': 'batchNumber',
  '5': 'authCode',
  '6': 'cardLast4',
  '7': 'cardBrand',
  '8': 'amount',
  '9': 'reference',
};

/** Mapeo de columnas de samples/standard/bank.csv */
export const BANK_MAPPING = {
  '0': 'postedAt',
  '1': 'valueDate',
  '2': 'description',
  '3': 'reference',
  '4': 'batchNumber',
  '5': 'authCode',
  '6': 'cardLast4',
  '7': 'grossAmount',
  '8': 'feeAmount',
  '9': 'withholdingAmount',
  '10': 'amount',
  '11': 'movementType',
};

export async function importFile(
  app: INestApplication,
  token: string,
  reconciliationId: string,
  sourceType: 'POS' | 'BANK',
  file: string,
  filename: string,
  mime: string,
  body: Record<string, unknown>,
) {
  const auth = { Authorization: `Bearer ${token}` };
  const up = await request(app.getHttpServer())
    .post(`/api/v1/reconciliations/${reconciliationId}/files`)
    .set(auth)
    .field('sourceType', sourceType)
    .attach('file', readFileSync(file), { filename, contentType: mime });
  if (up.status !== 201) throw new Error(`Subida fallida: ${up.status}`);
  const res = await request(app.getHttpServer())
    .post(`/api/v1/files/${up.body.id}/import`)
    .set(auth)
    .send(body);
  if (res.body.status !== 'IMPORTED') throw new Error(`Importación fallida: ${res.body.status}`);
  return res.body;
}

/** Importa el dataset sintético estándar (1.205 ventas POS y 974 abonos). */
export async function importStandard(
  app: INestApplication,
  token: string,
  reconciliationId: string,
) {
  await importFile(
    app,
    token,
    reconciliationId,
    'POS',
    path.join(ROOT, 'samples/standard/pos.csv'),
    'pos.csv',
    'text/csv',
    { columnMapping: POS_MAPPING, dateFormat: 'dd/MM/yyyy', decimalSeparator: ',' },
  );
  await importFile(
    app,
    token,
    reconciliationId,
    'BANK',
    path.join(ROOT, 'samples/standard/bank.csv'),
    'bank.csv',
    'text/csv',
    { columnMapping: BANK_MAPPING, dateFormat: 'yyyy-MM-dd', decimalSeparator: '.' },
  );
}
