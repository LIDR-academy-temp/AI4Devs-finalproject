/**
 * Integración de file-import-and-column-mapping: subida, vista previa, mapeo e importación,
 * con archivos sintéticos, los datasets de samples/ y los archivos reales de docs/archivos_ejemplo.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import * as XLSX from 'xlsx';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { DEFAULT_PASSWORD, DEMO_USERS, runSeed } from '../prisma/seed-data.js';
import { createTestApp, loginAs } from './helpers/create-app.js';

const ROOT = path.resolve(import.meta.dirname, '../../..');
const OTHER_EMAIL = 'otro-imp@empresa-b.test';
const OTHER_TAX_ID = '0666666666001';
const PREFIX = 'INT-IMP';
const PAN = '4111111111111111';

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function xlsx(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Detalle');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('Importación de archivos', () => {
  let prisma: PrismaClient;
  let app: INestApplication;
  let storageDir: string;
  let tokenA: string;
  let tokenB: string;
  let reconciliationId: string;
  let foreignReconciliationId: string;
  let counter = 0;

  const http = () => request(app.getHttpServer());
  const auth = (token = tokenA) => ({ Authorization: `Bearer ${token}` });
  const unique = () => `${PREFIX} ${++counter}`;

  const newReconciliation = async (token = tokenA) =>
    (
      await http()
        .post('/api/v1/reconciliations')
        .set(auth(token))
        .send({ name: unique(), periodStart: '2026-09-01', periodEnd: '2026-09-30' })
    ).body.id as string;

  const upload = (
    id: string,
    sourceType: string,
    buffer: Buffer,
    filename: string,
    contentType?: string,
    token = tokenA,
  ) =>
    http()
      .post(`/api/v1/reconciliations/${id}/files`)
      .set(auth(token))
      .field('sourceType', sourceType)
      .attach('file', buffer, { filename, contentType });

  const uploadPos = (rows: unknown[][], id = reconciliationId) =>
    upload(id, 'POS', xlsx(rows), `pos-${++counter}.xlsx`, MIME_XLSX);

  const doImport = (fileId: string, body: Record<string, unknown>, token = tokenA) =>
    http().post(`/api/v1/files/${fileId}/import`).set(auth(token)).send(body);

  const POS_MAPPING = {
    '0': 'transactionAt',
    '1': 'amount',
    '2': 'authCode',
    '3': 'cardLast4',
    '4': 'batchNumber',
  };
  const posBody = (extra: Record<string, unknown> = {}) => ({
    columnMapping: POS_MAPPING,
    dateFormat: 'dd/MM/yyyy',
    decimalSeparator: ',',
    headerRow: 1,
    ...extra,
  });
  const POS_HEADER = ['Fecha', 'Monto', 'Aut', 'Tarjeta', 'Lote'];

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
      create: { name: 'Empresa B S.A.', taxId: OTHER_TAX_ID },
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

    storageDir = mkdtempSync(path.join(tmpdir(), 'concilia-storage-'));
    app = await createTestApp({ STORAGE_DIR: storageDir });
    tokenA = await loginAs(app, DEMO_USERS[1].email, DEFAULT_PASSWORD);
    tokenB = await loginAs(app, OTHER_EMAIL, DEFAULT_PASSWORD);
    reconciliationId = await newReconciliation();
    foreignReconciliationId = await newReconciliation(tokenB);
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
    await prisma.user.deleteMany({ where: { email: OTHER_EMAIL } });
    await prisma.company.deleteMany({ where: { taxId: OTHER_TAX_ID } });
    await prisma.$disconnect();
    rmSync(storageDir, { recursive: true, force: true });
  });

  describe('POST /reconciliations/:id/files', () => {
    it('acepta un .xlsx POS: queda UPLOADED con nombre y total de filas, y se guarda el original', async () => {
      const buffer = xlsx([
        POS_HEADER,
        ['01/09/2026', '10,00', 'A1', '', 'L1'],
        ['02/09/2026', '20,00', 'A2', '', 'L1'],
      ]);
      const res = await upload(reconciliationId, 'POS', buffer, 'ventas.xlsx', MIME_XLSX);
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        sourceType: 'POS',
        originalName: 'ventas.xlsx',
        status: 'UPLOADED',
        totalRows: 2,
      });
      const row = await prisma.importedFile.findUniqueOrThrow({ where: { id: res.body.id } });
      const stored = path.join(storageDir, row.storagePath);
      expect(readFileSync(stored).equals(buffer)).toBe(true);
      expect(row.sha256).toMatch(/^[0-9a-f]{64}$/);
    });

    it('acepta un .csv', async () => {
      const res = await upload(
        reconciliationId,
        'BANK',
        Buffer.from('Fecha;Monto\n2026-09-01;10\n'),
        'banco.csv',
        'text/csv',
      );
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ sourceType: 'BANK', totalRows: 1 });
    });

    it.each([
      ['un .pdf', Buffer.from('%PDF-1.4'), 'x.pdf', 'application/pdf'],
      [
        'un .xls antiguo',
        Buffer.from([0xd0, 0xcf, 0x11, 0xe0]),
        'x.xls',
        'application/vnd.ms-excel',
      ],
      [
        'un .xlsx cuyo contenido no es un libro',
        Buffer.from('no soy un zip'),
        'falso.xlsx',
        MIME_XLSX,
      ],
      ['un .csv con tipo de contenido de imagen', Buffer.from('a;b\n1;2\n'), 'x.csv', 'image/png'],
    ])('rechaza con 415 y los formatos admitidos: %s', async (_caso, buffer, name, type) => {
      const res = await upload(reconciliationId, 'POS', buffer, name, type);
      expect(res.status).toBe(415);
      expect(res.body.message).toContain('.csv o .xlsx');
    });

    it('rechaza con 413 un archivo de más de 10 MB e indica el máximo', async () => {
      const big = Buffer.alloc(10 * 1024 * 1024 + 1024, 'a');
      const res = await upload(reconciliationId, 'POS', big, 'grande.csv', 'text/csv');
      expect(res.status).toBe(413);
      expect(res.body.message).toContain('10 MB');
    });

    it('rechaza un duplicado en la misma conciliación (409 con el nombre existente) y lo acepta en otra', async () => {
      const buffer = xlsx([POS_HEADER, ['01/09/2026', '99,99', 'DUP', '', 'L9']]);
      const id = await newReconciliation();
      expect((await upload(id, 'POS', buffer, 'original.xlsx', MIME_XLSX)).status).toBe(201);

      const again = await upload(id, 'POS', buffer, 'copia.xlsx', MIME_XLSX);
      expect(again.status).toBe(409);
      expect(again.body.message).toContain('original.xlsx');

      const other = await newReconciliation();
      expect((await upload(other, 'POS', buffer, 'copia.xlsx', MIME_XLSX)).status).toBe(201);
    });

    it.each(['CLOSED', 'PROCESSING'] as const)(
      'rechaza con 409 si la conciliación está %s',
      async (status) => {
        const id = await newReconciliation();
        await prisma.reconciliation.update({ where: { id }, data: { status } });
        const res = await uploadPos([POS_HEADER, ['01/09/2026', '1', 'a', '', 'l']], id);
        expect(res.status).toBe(409);
        expect(res.body.message).toContain('no admite cambios');
      },
    );

    it.each(['COMPLETED', 'FAILED'] as const)(
      'admite cargar si la conciliación está %s',
      async (status) => {
        const id = await newReconciliation();
        await prisma.reconciliation.update({ where: { id }, data: { status } });
        expect((await uploadPos([POS_HEADER, ['01/09/2026', '1', 'a', '', 'l']], id)).status).toBe(
          201,
        );
      },
    );

    it('404 para una conciliación de otra empresa', async () => {
      const res = await uploadPos(
        [POS_HEADER, ['01/09/2026', '1', 'a', '', 'l']],
        foreignReconciliationId,
      );
      expect(res.status).toBe(404);
    });

    it('400 sin archivo o con sourceType inválido', async () => {
      const noFile = await http()
        .post(`/api/v1/reconciliations/${reconciliationId}/files`)
        .set(auth())
        .field('sourceType', 'POS');
      expect(noFile.status).toBe(400);
      const badType = await upload(reconciliationId, 'OTRO', xlsx([['a']]), 'x.xlsx', MIME_XLSX);
      expect(badType.status).toBe(400);
    });

    it('401 sin token', async () => {
      const res = await http().post(`/api/v1/reconciliations/${reconciliationId}/files`);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /files/:id/preview', () => {
    let fileId: string;
    const rows = [
      ['Reporte POS'],
      ['Generado 2026-09-30'],
      [],
      POS_HEADER,
      ...Array.from({ length: 30 }, (_, i) => [
        `${String((i % 28) + 1).padStart(2, '0')}/09/2026`,
        '10,00',
        `A${i}`,
        PAN,
        'L1',
      ]),
    ];

    beforeAll(async () => {
      fileId = (await uploadPos(rows)).body.id;
    });

    it('con la cabecera en la fila indicada devuelve cabeceras, 20 filas y los campos estándar POS', async () => {
      const res = await http().get(`/api/v1/files/${fileId}/preview?headerRow=4`).set(auth());
      expect(res.status).toBe(200);
      expect(res.body.headers).toEqual(POS_HEADER);
      expect(res.body.rows).toHaveLength(20);
      expect(res.body.rows[0].rowNumber).toBe(5);
      expect(res.body.totalRows).toBe(30);
      expect(res.body.fields.map((f: { field: string }) => f.field)).toEqual([
        'transactionAt',
        'amount',
        'authCode',
        'cardLast4',
        'cardBrand',
        'batchNumber',
        'terminalId',
        'storeCode',
        'reference',
      ]);
      expect(res.body.fields.filter((f: { required: boolean }) => f.required)).toHaveLength(2);
    });

    it('recalcula al cambiar la fila de cabecera (por defecto, la 1)', async () => {
      const res = await http().get(`/api/v1/files/${fileId}/preview`).set(auth());
      expect(res.body.headers[0]).toBe('Reporte POS');
      expect(res.body.sheetName).toBe('Detalle');
      expect(res.body.sheetCount).toBe(1);
    });

    it('enmascara el PAN y nunca lo devuelve completo', async () => {
      const res = await http().get(`/api/v1/files/${fileId}/preview?headerRow=4`).set(auth());
      expect(JSON.stringify(res.body)).not.toContain(PAN);
      expect(res.body.rows[0].cells[3]).toBe('************1111');
    });

    it('para un extracto bancario ofrece los campos estándar del banco', async () => {
      const bank = await upload(
        reconciliationId,
        'BANK',
        Buffer.from('Fecha,Monto\n2026-09-01,5\n'),
        `b-${++counter}.csv`,
        'text/csv',
      );
      const res = await http().get(`/api/v1/files/${bank.body.id}/preview`).set(auth());
      expect(res.body.fields.map((f: { field: string }) => f.field)).toEqual([
        'postedAt',
        'valueDate',
        'amount',
        'grossAmount',
        'feeAmount',
        'withholdingAmount',
        'description',
        'reference',
        'batchNumber',
        'authCode',
        'cardLast4',
        'storeCode',
        'movementType',
      ]);
    });

    it('404 para un archivo de otra empresa y 400 con headerRow inválido', async () => {
      const foreign = (
        await uploadPos([POS_HEADER, ['01/09/2026', '1', 'a', '', 'l']], foreignReconciliationId)
      ).status;
      expect(foreign).toBe(404);
      const own = await prisma.importedFile
        .findFirstOrThrow({ where: { reconciliationId: foreignReconciliationId } })
        .catch(() => null);
      expect(own).toBeNull();

      const upB = await upload(
        foreignReconciliationId,
        'POS',
        xlsx([POS_HEADER, ['01/09/2026', '1', 'a', '', 'l']]),
        'b.xlsx',
        MIME_XLSX,
        tokenB,
      );
      expect(upB.status).toBe(201);
      const res = await http().get(`/api/v1/files/${upB.body.id}/preview`).set(auth());
      expect(res.status).toBe(404);
      expect((await doImport(upB.body.id, posBody())).status).toBe(404);
      expect((await http().get(`/api/v1/files/${upB.body.id}`).set(auth())).status).toBe(404);

      expect(
        (await http().get(`/api/v1/files/${fileId}/preview?headerRow=0`).set(auth())).status,
      ).toBe(400);
    });
  });

  describe('POST /files/:id/import — POS', () => {
    const mixedRows = () => {
      const rows: unknown[][] = [POS_HEADER];
      for (let i = 0; i < 1000; i++) {
        let fecha = `${String((i % 28) + 1).padStart(2, '0')}/09/2026`;
        let monto: unknown = `${(i % 500) + 1},50`;
        if (i < 12)
          fecha = '31/02/2026'; // fecha inválida
        else if (i < 15) monto = ''; // monto vacío
        rows.push([fecha, monto, `a${i}`, i === 20 ? PAN : '**** **** **** 1234', ` l${i % 3} `]);
      }
      return rows;
    };

    it('importa 985 de 1.000 filas y reporta las 15 rechazadas con fila, campo y motivo', async () => {
      const id = await newReconciliation();
      const file = await uploadPos(mixedRows(), id);
      const res = await doImport(file.body.id, posBody());

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: 'IMPORTED',
        totalRows: 1000,
        validRows: 985,
        errorRows: 15,
        discardedDebits: 0,
      });
      expect(res.body.errors).toHaveLength(15);
      expect(res.body.errors[0]).toEqual({
        row: 2,
        field: 'transactionAt',
        reason: 'Fecha inválida',
      });
      expect(res.body.errors[12]).toEqual({ row: 14, field: 'amount', reason: 'Monto inválido' });

      expect(await prisma.posTransaction.count({ where: { fileId: file.body.id } })).toBe(985);
      const saved = await prisma.importedFile.findUniqueOrThrow({ where: { id: file.body.id } });
      expect(saved).toMatchObject({
        status: 'IMPORTED',
        totalRows: 1000,
        validRows: 985,
        errorRows: 15,
      });
    });

    it('limita a 50 los errores de la respuesta pero informa el conteo total', async () => {
      const rows: unknown[][] = [
        POS_HEADER,
        ...Array.from({ length: 80 }, () => ['no-fecha', '10,00', 'a', '', 'l']),
      ];
      const file = await uploadPos(rows);
      const res = await doImport(file.body.id, posBody());
      expect(res.body.errorRows).toBe(80);
      expect(res.body.errors).toHaveLength(50);
      expect(res.body.status).toBe('FAILED'); // ninguna fila válida
      const detail = await http().get(`/api/v1/files/${file.body.id}`).set(auth());
      expect(detail.body.errors).toHaveLength(80);
    });

    it('normaliza campos, guarda la fila original con la tarjeta enmascarada y nunca persiste el PAN', async () => {
      const file = await uploadPos([
        POS_HEADER,
        ['05/03/2026', '1.234,56', ' ab12cd ', PAN, ' b001 '],
      ]);
      await doImport(file.body.id, posBody());
      const tx = await prisma.posTransaction.findFirstOrThrow({ where: { fileId: file.body.id } });
      expect(tx).toMatchObject({
        authCode: 'AB12CD',
        cardLast4: '1111',
        batchNumber: 'B001',
        rowNumber: 2,
      });
      expect(tx.amount.toFixed(2)).toBe('1234.56');
      expect(tx.transactionAt.toISOString()).toBe('2026-03-05T00:00:00.000Z');
      expect(tx.rawData).toMatchObject({ Fecha: '05/03/2026', Tarjeta: '************1111' });

      const dump = JSON.stringify(
        await prisma.$queryRawUnsafe(
          `SELECT * FROM pos_transactions WHERE file_id = '${file.body.id}'`,
        ),
      );
      expect(dump).not.toContain(PAN);
    });

    it('guarda los montos con precisión decimal exacta', async () => {
      const file = await uploadPos([
        POS_HEADER,
        ['01/09/2026', '0,10', '', '', ''],
        ['01/09/2026', '0,20', '', '', ''],
      ]);
      await doImport(file.body.id, posBody());
      const sum = await prisma.posTransaction.aggregate({
        where: { fileId: file.body.id },
        _sum: { amount: true },
      });
      expect(sum._sum.amount?.toFixed(2)).toBe('0.30');
    });

    it('la reimportación sustituye las filas del archivo en vez de duplicarlas', async () => {
      const file = await uploadPos([
        POS_HEADER,
        ['01/09/2026', '10,00', 'a', '', ''],
        ['02/09/2026', '20,00', 'b', '', ''],
      ]);
      await doImport(file.body.id, posBody());
      const second = await doImport(
        file.body.id,
        posBody({ columnMapping: { '0': 'transactionAt', '1': 'amount' } }),
      );
      expect(second.body.validRows).toBe(2);
      const rows = await prisma.posTransaction.findMany({ where: { fileId: file.body.id } });
      expect(rows).toHaveLength(2);
      expect(rows.every((r) => r.authCode === null)).toBe(true);
    });

    it('un fallo general no deja filas parciales y marca el archivo FAILED', async () => {
      const rows: unknown[][] = [POS_HEADER];
      for (let i = 0; i < 1500; i++)
        rows.push(['01/09/2026', i === 1400 ? '1.000.000.000.000,00' : '10,00', `a${i}`, '', '']);
      const file = await uploadPos(rows);
      const res = await doImport(file.body.id, posBody());
      expect(res.status).toBe(500);
      expect(await prisma.posTransaction.count({ where: { fileId: file.body.id } })).toBe(0);
      const saved = await prisma.importedFile.findUniqueOrThrow({ where: { id: file.body.id } });
      expect(saved.status).toBe('FAILED');
    });

    it('rechaza con 409 si la conciliación está cerrada', async () => {
      const id = await newReconciliation();
      const file = await uploadPos([POS_HEADER, ['01/09/2026', '1', '', '', '']], id);
      await prisma.reconciliation.update({ where: { id }, data: { status: 'CLOSED' } });
      expect((await doImport(file.body.id, posBody())).status).toBe(409);
    });

    describe('validación del mapeo', () => {
      let fileId: string;
      beforeAll(async () => {
        fileId = (await uploadPos([POS_HEADER, ['01/09/2026', '1', '', '', '']])).body.id;
      });

      it.each([
        ['falta la fecha', { columnMapping: { '1': 'amount' } }, 'transactionAt'],
        ['falta el monto', { columnMapping: { '0': 'transactionAt' } }, 'amount'],
        [
          'campo asignado dos veces',
          { columnMapping: { '0': 'transactionAt', '1': 'amount', '2': 'amount' } },
          'más de una columna',
        ],
        [
          'campo que no es de POS',
          { columnMapping: { '0': 'transactionAt', '1': 'amount', '2': 'grossAmount' } },
          'grossAmount',
        ],
        [
          'columna inexistente',
          { columnMapping: { '0': 'transactionAt', '1': 'amount', '99': 'reference' } },
          'no existe',
        ],
        ['formato de fecha inválido', { dateFormat: 'dd/MM' }, 'dateFormat'],
        ['separador inválido', { decimalSeparator: ';' }, 'decimalSeparator'],
      ])('400 si %s', async (_caso, cambio, texto) => {
        const res = await doImport(fileId, posBody(cambio));
        expect(res.status).toBe(400);
        expect(JSON.stringify(res.body.message)).toContain(texto);
      });

      it('las columnas sin asignar (cadena vacía) se ignoran', async () => {
        const res = await doImport(fileId, posBody({ columnMapping: { ...POS_MAPPING, '2': '' } }));
        expect(res.status).toBe(200);
      });
    });
  });

  describe('POST /files/:id/import — banco', () => {
    const header = [
      'Fecha Contable',
      'Fecha Valor',
      'Monto Bruto',
      'Comision',
      'Monto',
      'Tipo',
      'Local',
    ];
    const mapping = {
      '0': 'postedAt',
      '1': 'valueDate',
      '2': 'grossAmount',
      '3': 'feeAmount',
      '4': 'amount',
      '5': 'movementType',
      '6': 'storeCode',
    };
    const uploadBank = (rows: unknown[][]) =>
      upload(reconciliationId, 'BANK', xlsx(rows), `bank-${++counter}.xlsx`, MIME_XLSX);
    const bankBody = (extra: Record<string, unknown> = {}) => ({
      columnMapping: mapping,
      dateFormat: 'yyyy-MM-dd',
      decimalSeparator: '.',
      headerRow: 1,
      ...extra,
    });

    it('importa créditos con desglose y descarta débitos por columna de tipo', async () => {
      const file = await uploadBank([
        header,
        ['2026-09-01', '2026-09-02', '100.00', '3.50', '96.50', 'C', ' l001 '],
        ['2026-09-01', '', '', '', '50.00', 'D', 'L001'],
        ['2026-09-03', '2026-09-03', '', '', '20.00', 'C', 'L002'],
        ['2026-09-03', '', '', '', '', 'C', 'L002'],
      ]);
      const res = await doImport(file.body.id, bankBody());
      expect(res.body).toMatchObject({
        totalRows: 4,
        validRows: 2,
        errorRows: 1,
        discardedDebits: 1,
      });

      const rows = await prisma.bankMovement.findMany({
        where: { fileId: file.body.id },
        orderBy: { rowNumber: 'asc' },
      });
      expect(rows[0]).toMatchObject({ storeCode: 'L001', rowNumber: 2 });
      expect(
        [rows[0].amount, rows[0].grossAmount, rows[0].feeAmount].map((d) => d?.toFixed(2)),
      ).toEqual(['96.50', '100.00', '3.50']);
      expect(rows[0].postedAt.toISOString().slice(0, 10)).toBe('2026-09-01');
      expect(rows[0].valueDate?.toISOString().slice(0, 10)).toBe('2026-09-02');
      expect(rows[1].grossAmount).toBeNull();
      const saved = await prisma.importedFile.findUniqueOrThrow({ where: { id: file.body.id } });
      expect(saved.discardedRows).toBe(1);
    });

    it('descarta débitos por signo negativo cuando no hay columna de tipo', async () => {
      const file = await uploadBank([
        ['Fecha', 'Monto'],
        ['2026-09-01', '-30.00'],
        ['2026-09-01', '30.00'],
      ]);
      const { '5': _t, '6': _l, '1': _v, '2': _g, '3': _f, ...basic } = mapping;
      const res = await doImport(
        file.body.id,
        bankBody({ columnMapping: { ...basic, '4': undefined, '1': 'amount' } }),
      );
      expect(res.body).toMatchObject({ validRows: 1, discardedDebits: 1 });
    });

    it('interpreta fechas yyyyMMdd numéricas como las del extracto Diners', async () => {
      const file = await uploadBank([
        ['Fecha', 'Monto'],
        [20260726, 90.15],
        [20260727, 8.91],
      ]);
      const res = await doImport(
        file.body.id,
        bankBody({ columnMapping: { '0': 'postedAt', '1': 'amount' }, dateFormat: 'yyyyMMdd' }),
      );
      expect(res.body.validRows).toBe(2);
      const first = await prisma.bankMovement.findFirstOrThrow({
        where: { fileId: file.body.id },
        orderBy: { rowNumber: 'asc' },
      });
      expect(first.postedAt.toISOString().slice(0, 10)).toBe('2026-07-26');
    });

    it('exige la fecha de contabilización y el monto', async () => {
      const file = await uploadBank([header, ['2026-09-01', '', '', '', '1', 'C', '']]);
      const res = await doImport(file.body.id, bankBody({ columnMapping: { '4': 'amount' } }));
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('postedAt');
    });
  });

  describe('con los datasets sintéticos de samples/standard', () => {
    it('importa pos.csv (; y dd/MM/yyyy, coma decimal) y bank.csv (, y yyyy-MM-dd) descartando los 12 débitos', async () => {
      const id = await newReconciliation();
      const posCsv = readFileSync(path.join(ROOT, 'samples/standard/pos.csv'));
      const bankCsv = readFileSync(path.join(ROOT, 'samples/standard/bank.csv'));

      const pos = await upload(id, 'POS', posCsv, 'pos.csv', 'text/csv');
      const posRes = await doImport(pos.body.id, {
        columnMapping: {
          '0': 'transactionAt',
          '2': 'storeCode',
          '3': 'terminalId',
          '4': 'batchNumber',
          '5': 'authCode',
          '6': 'cardLast4',
          '7': 'cardBrand',
          '8': 'amount',
          '9': 'reference',
        },
        dateFormat: 'dd/MM/yyyy',
        decimalSeparator: ',',
      });
      expect(posRes.body).toMatchObject({
        status: 'IMPORTED',
        totalRows: 1205,
        validRows: 1205,
        errorRows: 0,
      });

      const bank = await upload(id, 'BANK', bankCsv, 'bank.csv', 'text/csv');
      const bankRes = await doImport(bank.body.id, {
        columnMapping: {
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
        },
        dateFormat: 'yyyy-MM-dd',
        decimalSeparator: '.',
      });
      expect(bankRes.body).toMatchObject({
        status: 'IMPORTED',
        totalRows: 986,
        validRows: 974,
        errorRows: 0,
        discardedDebits: 12,
      });
    });
  });

  describe('con los archivos reales de docs/archivos_ejemplo', () => {
    const dir = path.join(ROOT, 'docs/archivos_ejemplo');
    const available = existsSync(path.join(dir, 'Intranet_ejemplo.xlsx'));

    it.skipIf(!available)(
      'importa el POS (14.484 filas) en menos de 10 s y el extracto Diners (7.578 filas)',
      async () => {
        const id = await newReconciliation();
        const pos = await upload(
          id,
          'POS',
          readFileSync(path.join(dir, 'Intranet_ejemplo.xlsx')),
          'Intranet_ejemplo.xlsx',
          MIME_XLSX,
        );
        expect(pos.status).toBe(201);

        const started = Date.now();
        const posRes = await doImport(pos.body.id, {
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
        });
        const elapsed = Date.now() - started;
        expect(posRes.body).toMatchObject({ status: 'IMPORTED', totalRows: 14484, errorRows: 0 });
        expect(posRes.body.validRows).toBe(14484);
        expect(elapsed).toBeLessThan(10_000);
        const sample = await prisma.posTransaction.findFirstOrThrow({
          where: { fileId: pos.body.id },
          orderBy: { rowNumber: 'asc' },
        });
        expect(sample).toMatchObject({
          storeCode: 'ALM. CONDADO',
          batchNumber: 'M000891',
          reference: '000004649',
        });
        expect(sample.amount.toFixed(2)).toBe('140.21');

        const bank = await upload(
          id,
          'BANK',
          readFileSync(path.join(dir, 'Liquidaciones_Diners_ejemplo.xlsx')),
          'Liquidaciones_Diners_ejemplo.xlsx',
          MIME_XLSX,
        );
        const bankRes = await doImport(bank.body.id, {
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
        });
        expect(bankRes.body).toMatchObject({
          status: 'IMPORTED',
          totalRows: 7578,
          errorRows: 0,
          discardedDebits: 0,
        });
        const first = await prisma.bankMovement.findFirstOrThrow({
          where: { fileId: bank.body.id },
          orderBy: { rowNumber: 'asc' },
        });
        expect(first).toMatchObject({
          storeCode: '450404',
          batchNumber: '1038',
          reference: '19733',
          cardLast4: '6618',
          authCode: '187596',
        });
        expect(first.amount.toFixed(2)).toBe('90.15');
        expect(first.postedAt.toISOString().slice(0, 10)).toBe('2026-07-26');
      },
    );
  });
});
