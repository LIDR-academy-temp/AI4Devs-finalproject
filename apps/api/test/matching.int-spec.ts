/**
 * Integración de matching-engine-core: relación de locales, ejecución asíncrona, persistencia
 * atómica y estadísticas, con el dataset sintético como oráculo y los archivos reales de ejemplo.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { DEFAULT_PASSWORD, DEMO_USERS, runSeed } from '../prisma/seed-data.js';
import { createTestApp, loginAs } from './helpers/create-app.js';

const ROOT = path.resolve(import.meta.dirname, '../../..');
const OTHER_EMAIL = 'otro-match@empresa-c.test';
const OTHER_TAX_ID = '0555555555001';
const PREFIX = 'INT-MATCH';
const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const POS_MAPPING = {
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
const BANK_MAPPING = {
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

describe('Motor de conciliación (nivel 1 y 2) y ejecución', () => {
  let prisma: PrismaClient;
  let app: INestApplication;
  let storageDir: string;
  let tokenA: string;
  let tokenB: string;
  let counter = 0;

  const http = () => request(app.getHttpServer());
  const auth = (token = tokenA) => ({ Authorization: `Bearer ${token}` });

  const newReconciliation = async (token = tokenA) =>
    (
      await http()
        .post('/api/v1/reconciliations')
        .set(auth(token))
        .send({
          name: `${PREFIX} ${++counter}`,
          periodStart: '2026-09-01',
          periodEnd: '2026-09-30',
          config: { feePercent: 2.5, withholdingPercent: 1 },
        })
    ).body.id as string;

  const importFile = async (
    id: string,
    sourceType: 'POS' | 'BANK',
    file: string,
    filename: string,
    mime: string,
    body: Record<string, unknown>,
  ) => {
    const up = await http()
      .post(`/api/v1/reconciliations/${id}/files`)
      .set(auth())
      .field('sourceType', sourceType)
      .attach('file', readFileSync(file), { filename, contentType: mime });
    expect(up.status).toBe(201);
    const res = await http().post(`/api/v1/files/${up.body.id}/import`).set(auth()).send(body);
    expect(res.body.status).toBe('IMPORTED');
    return res.body;
  };

  const importStandard = async (id: string) => {
    await importFile(
      id,
      'POS',
      path.join(ROOT, 'samples/standard/pos.csv'),
      'pos.csv',
      'text/csv',
      {
        columnMapping: POS_MAPPING,
        dateFormat: 'dd/MM/yyyy',
        decimalSeparator: ',',
      },
    );
    await importFile(
      id,
      'BANK',
      path.join(ROOT, 'samples/standard/bank.csv'),
      'bank.csv',
      'text/csv',
      {
        columnMapping: BANK_MAPPING,
        dateFormat: 'yyyy-MM-dd',
        decimalSeparator: '.',
      },
    );
  };

  const run = (id: string, body: Record<string, unknown> = {}, token = tokenA) =>
    http().post(`/api/v1/reconciliations/${id}/run`).set(auth(token)).send(body);

  const waitFinished = async (id: string) => {
    for (let i = 0; i < 300; i++) {
      const res = await http().get(`/api/v1/reconciliations/${id}`).set(auth());
      if (res.body.status !== 'PROCESSING') return res.body;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('La ejecución no terminó a tiempo');
  };

  const cleanup = () =>
    prisma.reconciliation.deleteMany({ where: { name: { startsWith: PREFIX } } });

  beforeAll(async () => {
    execSync('npx prisma migrate deploy', { stdio: 'pipe', env: process.env });
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
    await prisma.$connect();
    await runSeed(prisma);
    await cleanup();
    const companyB = await prisma.company.upsert({
      where: { taxId: OTHER_TAX_ID },
      update: {},
      create: { name: 'Empresa C S.A.', taxId: OTHER_TAX_ID },
    });
    await prisma.user.upsert({
      where: { email: OTHER_EMAIL },
      update: {},
      create: {
        companyId: companyB.id,
        name: 'Otro',
        email: OTHER_EMAIL,
        passwordHash: await bcrypt.hash(DEFAULT_PASSWORD, 12),
      },
    });
    storageDir = mkdtempSync(path.join(tmpdir(), 'concilia-match-'));
    app = await createTestApp({ STORAGE_DIR: storageDir });
    tokenA = await loginAs(app, DEMO_USERS[1].email, DEFAULT_PASSWORD);
    tokenB = await loginAs(app, OTHER_EMAIL, DEFAULT_PASSWORD);
  });

  afterAll(async () => {
    await cleanup();
    await prisma.storeMapping.deleteMany({
      where: { company: { taxId: OTHER_TAX_ID } },
    });
    await app.close();
    await prisma.user.deleteMany({ where: { email: OTHER_EMAIL } });
    await prisma.company.deleteMany({ where: { taxId: OTHER_TAX_ID } });
    await prisma.$disconnect();
    rmSync(storageDir, { recursive: true, force: true });
  });

  describe('POST /reconciliations/:id/run — precondiciones', () => {
    it('422 si falta el extracto bancario y el estado no cambia', async () => {
      const id = await newReconciliation();
      await importFile(
        id,
        'POS',
        path.join(ROOT, 'samples/standard/pos.csv'),
        'pos.csv',
        'text/csv',
        {
          columnMapping: POS_MAPPING,
          dateFormat: 'dd/MM/yyyy',
          decimalSeparator: ',',
        },
      );
      const res = await run(id);
      expect(res.status).toBe(422);
      expect(res.body.message).toContain('extracto bancario');
      const detail = await http().get(`/api/v1/reconciliations/${id}`).set(auth());
      expect(detail.body.status).toBe('DRAFT');
    });

    it('409 si ya está en PROCESSING', async () => {
      const id = await newReconciliation();
      await prisma.reconciliation.update({ where: { id }, data: { status: 'PROCESSING' } });
      const res = await run(id);
      expect(res.status).toBe(409);
    });

    it('404 para una conciliación de otra empresa', async () => {
      const id = await newReconciliation();
      const res = await run(id, {}, tokenB);
      expect(res.status).toBe(404);
    });

    it('400 con parámetros fuera de rango', async () => {
      const id = await newReconciliation();
      expect((await run(id, { dateWindowDays: -1 })).status).toBe(400);
      expect((await run(id, { amountTolerance: 'x' })).status).toBe(400);
    });
  });

  describe('ejecución con el dataset sintético', () => {
    let id: string;

    it('responde 202, termina en COMPLETED con estadísticas y cruces sin transacciones compartidas', async () => {
      id = await newReconciliation();
      await importStandard(id);
      const res = await run(id, { dateWindowDays: 3 });
      expect(res.status).toBe(202);
      expect(res.body).toMatchObject({ status: 'PROCESSING' });

      const detail = await waitFinished(id);
      expect(detail.status).toBe('COMPLETED');
      expect(detail.stats).toMatchObject({
        posCount: 1205,
        bankCount: 974,
        config: { dateWindowDays: 3, feePercent: 2.5, withholdingPercent: 1 },
      });
      expect(detail.stats.matchedPercent).toBeGreaterThan(0);
      expect(detail.completedAt).not.toBeNull();

      const items = await prisma.matchItem.findMany({ where: { match: { reconciliationId: id } } });
      const posIds = items.map((i) => i.posTransactionId).filter(Boolean);
      const bankIds = items.map((i) => i.bankMovementId).filter(Boolean);
      expect(new Set(posIds).size).toBe(posIds.length);
      expect(new Set(bankIds).size).toBe(bankIds.length);
    });

    it('precisión ≥ 99 % frente a expected.json y cobertura de niveles 1-2 registrada', async () => {
      const expected = JSON.parse(
        readFileSync(path.join(ROOT, 'samples/standard/expected.json'), 'utf8'),
      ) as {
        matches: { level: string; posRows: number[]; bankRows: number[] }[];
      };
      const truth = new Set(
        expected.matches
          .filter((m) => m.level === 'EXACT' || m.level === 'TOLERANCE')
          .map((m) => `${m.posRows[0]}|${m.bankRows[0]}`),
      );
      const matches = await prisma.match.findMany({
        where: { reconciliationId: id },
        include: { items: { include: { posTransaction: true, bankMovement: true } } },
      });
      const pairs = matches.map((m) => ({
        status: m.status,
        // expected.json numera desde 1 la primera fila de datos; la BD guarda la fila del archivo
        key: `${m.items.find((i) => i.posTransaction)!.posTransaction!.rowNumber - 1}|${
          m.items.find((i) => i.bankMovement)!.bankMovement!.rowNumber - 1
        }`,
      }));
      const confirmed = pairs.filter((p) => p.status === 'CONFIRMED');
      const wrong = confirmed.filter((p) => !truth.has(p.key));
      const precision = (confirmed.length - wrong.length) / confirmed.length;
      const coverage = pairs.filter((p) => truth.has(p.key)).length / truth.size;
      console.info(
        `Dataset estándar · confirmados ${confirmed.length}, incorrectos ${wrong.length}, ` +
          `precisión ${(precision * 100).toFixed(2)} %, cobertura niveles 1-2 ${(coverage * 100).toFixed(2)} %`,
      );
      expect(precision).toBeGreaterThanOrEqual(0.99);
      expect(coverage).toBeGreaterThanOrEqual(0.9);
    });

    it('re-ejecutar con otros parámetros recalcula y conserva los cruces manuales', async () => {
      const pendingPos = await prisma.posTransaction.findFirstOrThrow({
        where: { reconciliationId: id, status: 'PENDING' },
      });
      const pendingBank = await prisma.bankMovement.findFirstOrThrow({
        where: { reconciliationId: id, status: 'PENDING' },
      });
      const manual = await prisma.match.create({
        data: {
          reconciliationId: id,
          method: 'MANUAL',
          cardinality: 'ONE_TO_ONE',
          status: 'CONFIRMED',
          confidence: 1,
          posTotal: pendingPos.amount,
          bankTotal: pendingBank.amount,
          difference: pendingBank.amount.minus(pendingPos.amount),
          items: {
            create: [{ posTransactionId: pendingPos.id }, { bankMovementId: pendingBank.id }],
          },
        },
      });
      await prisma.posTransaction.update({
        where: { id: pendingPos.id },
        data: { status: 'MATCHED' },
      });
      await prisma.bankMovement.update({
        where: { id: pendingBank.id },
        data: { status: 'MATCHED' },
      });

      expect((await run(id, { dateWindowDays: 1 })).status).toBe(202);
      const detail = await waitFinished(id);
      expect(detail.status).toBe('COMPLETED');
      expect(detail.stats.config.dateWindowDays).toBe(1);
      expect(await prisma.match.findUnique({ where: { id: manual.id } })).not.toBeNull();
      expect(
        (await prisma.posTransaction.findUniqueOrThrow({ where: { id: pendingPos.id } })).status,
      ).toBe('MATCHED');
    });

    it('un fallo deja FAILED con stats.error y sin cruces parciales', async () => {
      const before = await prisma.match.count({ where: { reconciliationId: id } });
      await prisma.reconciliation.update({
        where: { id },
        data: { config: { dateWindowDays: 3, amountTolerance: 'abc' } },
      });
      expect((await run(id)).status).toBe(202);
      const detail = await waitFinished(id);
      expect(detail.status).toBe('FAILED');
      expect(typeof detail.stats.error).toBe('string');
      expect(await prisma.match.count({ where: { reconciliationId: id } })).toBe(before);
    });
  });

  describe('recuperación al arrancar', () => {
    it('una conciliación en PROCESSING pasa a FAILED como interrumpida', async () => {
      const id = await newReconciliation();
      await prisma.reconciliation.update({ where: { id }, data: { status: 'PROCESSING' } });
      const second = await createTestApp({ STORAGE_DIR: storageDir });
      try {
        const row = await prisma.reconciliation.findUniqueOrThrow({ where: { id } });
        expect(row.status).toBe('FAILED');
        expect((row.stats as { error: string }).error).toContain('interrumpida');
      } finally {
        await second.close();
      }
    });
  });

  describe('relación de locales', () => {
    const dir = path.join(ROOT, 'docs/archivos_ejemplo');
    const mappingFile = path.join(dir, 'Locales_mapeo_ejemplo.xlsx');
    const available =
      existsSync(mappingFile) && existsSync(path.join(dir, 'Intranet_ejemplo.xlsx'));

    it('rechaza archivos sin cabecera válida o con locales duplicados con distinto código', async () => {
      const csv = Buffer.from('codigo,local\n1,ALM. UNO\n2,ALM.  UNO\n');
      const res = await http()
        .put('/api/v1/store-mappings')
        .set(auth(tokenB))
        .attach('file', csv, { filename: 'm.csv', contentType: 'text/csv' });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('dos códigos');
    });

    it('cada empresa ve solo su propia tabla', async () => {
      const csv = Buffer.from('codigo,local\n9,ALM. SOLO B\n');
      const put = await http()
        .put('/api/v1/store-mappings')
        .set(auth(tokenB))
        .attach('file', csv, { filename: 'm.csv', contentType: 'text/csv' });
      expect(put.status).toBe(200);
      expect(put.body.count).toBe(1);
      const own = await http().get('/api/v1/store-mappings').set(auth(tokenB));
      expect(own.body).toEqual([{ posStoreName: 'ALM. SOLO B', bankStoreCode: '9' }]);
      const other = await http().get('/api/v1/store-mappings').set(auth(tokenA));
      expect(JSON.stringify(other.body)).not.toContain('SOLO B');
    });

    it.skipIf(!available)(
      'con los archivos reales: cruza por local + lote + referencia e informa los locales sin mapear',
      async () => {
        const put = await http()
          .put('/api/v1/store-mappings')
          .set(auth())
          .attach('file', readFileSync(mappingFile), {
            filename: 'Locales_mapeo_ejemplo.xlsx',
            contentType: MIME_XLSX,
          });
        expect(put.status).toBe(200);
        expect(put.body.count).toBe(30);

        const id = await newReconciliation();
        await importFile(
          id,
          'POS',
          path.join(dir, 'Intranet_ejemplo.xlsx'),
          'Intranet_ejemplo.xlsx',
          MIME_XLSX,
          {
            columnMapping: {
              '0': 'storeCode',
              '3': 'transactionAt',
              '7': 'batchNumber',
              '8': 'reference',
              '9': 'cardBrand',
              '13': 'amount',
            },
            dateFormat: 'yyyy-MM-dd',
            decimalSeparator: '.',
          },
        );
        await importFile(
          id,
          'BANK',
          path.join(dir, 'Liquidaciones_Diners_ejemplo.xlsx'),
          'Liquidaciones_Diners_ejemplo.xlsx',
          MIME_XLSX,
          {
            columnMapping: {
              '1': 'postedAt',
              '3': 'valueDate',
              '4': 'storeCode',
              '8': 'batchNumber',
              '9': 'reference',
              '10': 'cardLast4',
              '18': 'grossAmount',
              '19': 'feeAmount',
              '23': 'amount',
              '41': 'authCode',
            },
            dateFormat: 'yyyyMMdd',
            decimalSeparator: '.',
          },
        );

        const started = Date.now();
        expect((await run(id)).status).toBe(202);
        const detail = await waitFinished(id);
        console.info(`Archivos reales · ejecución en ${Date.now() - started} ms`, detail.stats);
        expect(detail.status).toBe('COMPLETED');
        expect(detail.stats.matchedByMethod.EXACT).toBeGreaterThan(4000);
        expect(detail.stats.unmappedStores).toContain('ALM. EXTERNOS 02');

        const bank = await prisma.bankMovement.findFirstOrThrow({
          where: { reconciliationId: id, status: 'MATCHED' },
          include: { matchItems: { include: { match: true } } },
        });
        expect(bank.matchItems[0]!.match).toMatchObject({
          method: 'EXACT',
          status: 'CONFIRMED',
          difference: expect.anything(),
        });
        expect(bank.matchItems[0]!.match.difference.toFixed(2)).toBe('0.00');
      },
      120_000,
    );
  });
});
