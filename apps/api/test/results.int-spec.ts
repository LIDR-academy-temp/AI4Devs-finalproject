/**
 * Integración de results-and-manual-matching: listados con filtros y paginación, resumen,
 * cruce manual, exclusividad, concurrencia, deshacer, confirmar y rechazar propuestas.
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { DEFAULT_PASSWORD, DEMO_USERS, runSeed } from '../prisma/seed-data.js';
import { createTestApp, loginAs } from './helpers/create-app.js';
import {
  BANK_MAPPING,
  POS_MAPPING,
  importFile,
  importStandard,
} from './helpers/import-fixtures.js';
import { expectForeignResourceIsNotFound } from './helpers/tenant-isolation.js';

const OTHER_EMAIL = 'otro-results@empresa-d.test';
const OTHER_TAX_ID = '0444444444001';
const PREFIX = 'INT-RES';
const MISSING = '00000000-0000-4000-8000-000000000000';

describe('Resultados y cruce manual', () => {
  let prisma: PrismaClient;
  let app: INestApplication;
  let storageDir: string;
  let tokenA: string;
  let tokenB: string;
  let id: string;
  let foreignId: string;
  let counter = 0;

  const http = () => request(app.getHttpServer());
  const auth = (token = tokenA) => ({ Authorization: `Bearer ${token}` });
  const base = (rid = id) => `/api/v1/reconciliations/${rid}`;

  const newReconciliation = async (token = tokenA) =>
    (
      await http()
        .post('/api/v1/reconciliations')
        .set(auth(token))
        .send({
          name: `${PREFIX} ${++counter}`,
          periodStart: '2026-09-01',
          periodEnd: '2026-09-30',
        })
    ).body.id as string;

  const runAndWait = async (rid: string) => {
    expect(
      (
        await http()
          .post(`${base(rid)}/run`)
          .set(auth())
          .send({})
      ).status,
    ).toBe(202);
    for (let i = 0; i < 300; i++) {
      const res = await http().get(base(rid)).set(auth());
      if (res.body.status !== 'PROCESSING') return res.body;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('La ejecución no terminó');
  };

  const pendingPos = (n: number) =>
    prisma.posTransaction.findMany({
      where: { reconciliationId: id, status: 'PENDING' },
      orderBy: { rowNumber: 'asc' },
      take: n,
    });
  const pendingBank = (n: number) =>
    prisma.bankMovement.findMany({
      where: { reconciliationId: id, status: 'PENDING' },
      orderBy: { rowNumber: 'asc' },
      take: n,
    });
  const manual = (body: Record<string, unknown>, rid = id, token = tokenA) =>
    http()
      .post(`${base(rid)}/matches`)
      .set(auth(token))
      .send(body);
  const summary = async (rid = id) =>
    (
      await http()
        .get(`${base(rid)}/summary`)
        .set(auth())
    ).body;

  /** Crea un cruce PROPOSED entre dos pendientes (el estándar solo trae confirmados). */
  const makeProposal = async (difference = '0.00') => {
    const [p] = await pendingPos(1);
    const [b] = await pendingBank(1);
    const match = await prisma.match.create({
      data: {
        reconciliationId: id,
        method: 'TOLERANCE',
        cardinality: 'ONE_TO_ONE',
        status: 'PROPOSED',
        confidence: 0.75,
        posTotal: p!.amount,
        bankTotal: p!.amount.plus(difference),
        difference,
        explanation: 'propuesta de prueba',
        items: { create: [{ posTransactionId: p!.id }, { bankMovementId: b!.id }] },
      },
    });
    await prisma.posTransaction.update({ where: { id: p!.id }, data: { status: 'PROPOSED' } });
    await prisma.bankMovement.update({ where: { id: b!.id }, data: { status: 'PROPOSED' } });
    return { matchId: match.id, posId: p!.id, bankId: b!.id };
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
      create: { name: 'Empresa D S.A.', taxId: OTHER_TAX_ID },
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
    storageDir = mkdtempSync(path.join(tmpdir(), 'concilia-res-'));
    app = await createTestApp({ STORAGE_DIR: storageDir });
    tokenA = await loginAs(app, DEMO_USERS[1].email, DEFAULT_PASSWORD);
    tokenB = await loginAs(app, OTHER_EMAIL, DEFAULT_PASSWORD);

    id = await newReconciliation();
    await importStandard(app, tokenA, id);
    expect((await runAndWait(id)).status).toBe('COMPLETED');
    foreignId = await newReconciliation(tokenB);
  }, 60_000);

  afterAll(async () => {
    await cleanup();
    await app.close();
    await prisma.user.deleteMany({ where: { email: OTHER_EMAIL } });
    await prisma.company.deleteMany({ where: { taxId: OTHER_TAX_ID } });
    await prisma.$disconnect();
    rmSync(storageDir, { recursive: true, force: true });
  });

  describe('listados', () => {
    it('ventas POS: paginación con total y tamaño de página', async () => {
      const res = await http().get(`${base()}/pos-transactions?page=2&pageSize=50`).set(auth());
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ total: 1205, page: 2, pageSize: 50 });
      expect(res.body.items).toHaveLength(50);
      expect(res.body.items[0]).toEqual(
        expect.objectContaining({ amount: expect.any(String), rawData: expect.any(Object) }),
      );
    });

    it('rechaza un tamaño de página mayor de 100', async () => {
      const res = await http().get(`${base()}/pos-transactions?pageSize=101`).set(auth());
      expect(res.status).toBe(400);
    });

    it('filtra por estado, monto y marca', async () => {
      const pending = await http()
        .get(`${base()}/pos-transactions?status=PENDING&pageSize=100`)
        .set(auth());
      expect(pending.body.total).toBeGreaterThan(0);
      expect(pending.body.items.every((t: { status: string }) => t.status === 'PENDING')).toBe(
        true,
      );

      const ranged = await http()
        .get(`${base()}/pos-transactions?amountMin=100&amountMax=200&pageSize=100`)
        .set(auth());
      expect(ranged.body.total).toBeGreaterThan(0);
      for (const t of ranged.body.items) {
        expect(Number(t.amount)).toBeGreaterThanOrEqual(100);
        expect(Number(t.amount)).toBeLessThanOrEqual(200);
      }

      const visa = await http()
        .get(`${base()}/pos-transactions?brand=visa&pageSize=100`)
        .set(auth());
      expect(visa.body.total).toBeGreaterThan(0);
      expect(visa.body.items.every((t: { cardBrand: string }) => t.cardBrand === 'VISA')).toBe(
        true,
      );
    });

    it('filtra por rango de fechas (el día final es inclusivo)', async () => {
      const res = await http()
        .get(`${base()}/pos-transactions?dateFrom=2026-09-03&dateTo=2026-09-03&pageSize=100`)
        .set(auth());
      expect(res.body.total).toBeGreaterThan(0);
      for (const t of res.body.items) expect(t.transactionAt.slice(0, 10)).toBe('2026-09-03');
      const bank = await http()
        .get(`${base()}/bank-movements?dateFrom=2026-09-03&dateTo=2026-09-03&pageSize=100`)
        .set(auth());
      expect(bank.body.total).toBeGreaterThan(0);
      for (const t of bank.body.items) expect(t.postedAt).toBe('2026-09-03');
    });

    it('movimientos bancarios: total de abonos y filtro por estado', async () => {
      const all = await http().get(`${base()}/bank-movements?pageSize=1`).set(auth());
      expect(all.body.total).toBe(974);
      const matched = await http()
        .get(`${base()}/bank-movements?status=MATCHED&pageSize=1`)
        .set(auth());
      expect(matched.body.total).toBeGreaterThan(0);
    });

    it('cruces: filtro por método e inclusión de transacciones de ambos lados', async () => {
      const res = await http()
        .get(`${base()}/matches?method=TOLERANCE&status=CONFIRMED&pageSize=5`)
        .set(auth());
      expect(res.body.total).toBe(180);
      const m = res.body.items[0];
      expect(m).toMatchObject({
        method: 'TOLERANCE',
        cardinality: 'ONE_TO_ONE',
        status: 'CONFIRMED',
      });
      expect(m.posTransactions).toHaveLength(1);
      expect(m.bankMovements).toHaveLength(1);
      expect(m.explanation).toEqual(expect.any(String));
    });

    it('resumen: indicadores coherentes con los listados', async () => {
      const s = await summary();
      expect(s).toMatchObject({ posCount: 1205, bankCount: 974 });
      expect(s.matchedPos).toBe(900);
      const pending = await http()
        .get(`${base()}/pos-transactions?status=PENDING&pageSize=1`)
        .set(auth());
      expect(s.pendingPos).toBe(pending.body.total);
      expect(Number(s.pendingPosTotal)).toBeGreaterThan(0);
    });

    it('resumen de una conciliación sin ejecutar: totales importados y cruces vacíos', async () => {
      const draft = await newReconciliation();
      await importStandard(app, tokenA, draft);
      const s = await summary(draft);
      expect(s).toMatchObject({ posCount: 1205, matchedPos: 0, proposed: 0, matchedPercent: 0 });
      expect(s.pendingPos).toBe(1205);
    });

    it.each(['summary', 'pos-transactions', 'bank-movements', 'matches'])(
      'aislamiento por empresa en /%s',
      async (resource) => {
        await expectForeignResourceIsNotFound({
          app,
          tokenCompanyA: tokenA,
          foreignResourcePath: `${base(foreignId)}/${resource}`,
          missingResourcePath: `${base(MISSING)}/${resource}`,
        });
      },
    );
  });

  describe('POST /reconciliations/:id/matches — cruce manual', () => {
    it('N:1 con diferencia: crea MANUAL CONFIRMED, totales del servidor y estados MATCHED', async () => {
      const pos = await pendingPos(3);
      const [bank] = await pendingBank(1);
      const before = await summary();
      const res = await manual({
        posIds: pos.map((t) => t.id),
        bankIds: [bank!.id],
        note: 'Depósito del lote 0452 neto de comisión',
      });
      expect(res.status).toBe(201);
      const expectedPos = pos.reduce((a, t) => a + Number(t.amount), 0);
      expect(res.body).toMatchObject({
        method: 'MANUAL',
        cardinality: 'MANY_TO_ONE',
        status: 'CONFIRMED',
        explanation: 'Depósito del lote 0452 neto de comisión',
        createdBy: DEMO_USERS[1].name,
        confirmedBy: DEMO_USERS[1].name,
      });
      expect(Number(res.body.posTotal)).toBeCloseTo(expectedPos, 2);
      expect(Number(res.body.difference)).toBeCloseTo(Number(bank!.amount) - expectedPos, 2);
      expect(res.body.posTransactions).toHaveLength(3);

      const after = await summary();
      expect(after.matchedPos).toBe(before.matchedPos + 3);
      expect(after.pendingBank).toBe(before.pendingBank - 1);
      expect(after.matchedByMethod.MANUAL).toBe(1);
      // El resumen guardado en la conciliación también se actualizó
      const stored = await prisma.reconciliation.findUniqueOrThrow({ where: { id } });
      expect((stored.stats as { matchedPos: number }).matchedPos).toBe(after.matchedPos);
      const log = await prisma.auditLog.findFirst({
        where: { entityId: res.body.id, action: 'CREATE_MANUAL_MATCH' },
      });
      expect(log).not.toBeNull();
    });

    it('409 si una transacción ya está cruzada y no se crea nada', async () => {
      const confirmed = await prisma.posTransaction.findFirstOrThrow({
        where: { reconciliationId: id, status: 'MATCHED' },
      });
      const [bank] = await pendingBank(1);
      const matchesBefore = await prisma.match.count({ where: { reconciliationId: id } });
      const res = await manual({ posIds: [confirmed.id], bankIds: [bank!.id] });
      expect(res.status).toBe(409);
      expect(res.body.message).toContain(`fila ${confirmed.rowNumber}`);
      expect(await prisma.match.count({ where: { reconciliationId: id } })).toBe(matchesBefore);
      expect(
        (await prisma.bankMovement.findUniqueOrThrow({ where: { id: bank!.id } })).status,
      ).toBe('PENDING');
    });

    it('concurrencia: dos peticiones con el mismo movimiento → una crea, la otra recibe 409', async () => {
      const [p1, p2] = await pendingPos(2);
      const [bank] = await pendingBank(1);
      const [a, b] = await Promise.all([
        manual({ posIds: [p1!.id], bankIds: [bank!.id] }),
        manual({ posIds: [p2!.id], bankIds: [bank!.id] }),
      ]);
      expect([a.status, b.status].sort()).toEqual([201, 409]);
      const items = await prisma.matchItem.count({ where: { bankMovementId: bank!.id } });
      expect(items).toBe(1);
    });

    it('el índice único parcial impide dos cruces activos para la misma transacción', async () => {
      const [p] = await pendingPos(1);
      const [b] = await pendingBank(1);
      const mk = () =>
        prisma.match.create({
          data: {
            reconciliationId: id,
            method: 'MANUAL',
            cardinality: 'ONE_TO_ONE',
            status: 'CONFIRMED',
            confidence: 1,
            posTotal: 1,
            bankTotal: 1,
            difference: 0,
            items: { create: [{ posTransactionId: p!.id }, { bankMovementId: b!.id }] },
          },
        });
      const first = await mk();
      await expect(mk()).rejects.toThrow();
      await prisma.match.delete({ where: { id: first.id } });
    });

    it('400 con nota de más de 500 caracteres, listas vacías o ids inválidos', async () => {
      const [p] = await pendingPos(1);
      const [b] = await pendingBank(1);
      expect(
        (await manual({ posIds: [p!.id], bankIds: [b!.id], note: 'x'.repeat(501) })).status,
      ).toBe(400);
      expect((await manual({ posIds: [], bankIds: [b!.id] })).status).toBe(400);
      expect((await manual({ posIds: ['no-uuid'], bankIds: [b!.id] })).status).toBe(400);
    });

    it('404 con una transacción de otra conciliación o empresa', async () => {
      const [b] = await pendingBank(1);
      expect((await manual({ posIds: [MISSING], bankIds: [b!.id] })).status).toBe(404);
      expect(
        (await manual({ posIds: [MISSING], bankIds: [b!.id] }, foreignId, tokenA)).status,
      ).toBe(404);
    });
  });

  describe('deshacer', () => {
    it('deshacer un cruce automático devuelve ambas transacciones a PENDING', async () => {
      const list = await http()
        .get(`${base()}/matches?method=EXACT&status=CONFIRMED&pageSize=1`)
        .set(auth());
      const match = list.body.items[0];
      const before = await summary();
      const res = await http().delete(`/api/v1/matches/${match.id}`).set(auth());
      expect(res.status).toBe(204);
      expect(
        (
          await prisma.posTransaction.findUniqueOrThrow({
            where: { id: match.posTransactions[0].id },
          })
        ).status,
      ).toBe('PENDING');
      expect(
        (await prisma.bankMovement.findUniqueOrThrow({ where: { id: match.bankMovements[0].id } }))
          .status,
      ).toBe('PENDING');
      const after = await summary();
      expect(after.matchedPos).toBe(before.matchedPos - 1);
      expect(after.pendingPos).toBe(before.pendingPos + 1);
      expect(await prisma.match.findUnique({ where: { id: match.id } })).toBeNull();
      expect(
        await prisma.auditLog.findFirst({ where: { entityId: match.id, action: 'UNDO_MATCH' } }),
      ).not.toBeNull();
    });

    it('deshacer un cruce manual y volver a crearlo con las mismas transacciones', async () => {
      const [p] = await pendingPos(1);
      const [b] = await pendingBank(1);
      const created = await manual({ posIds: [p!.id], bankIds: [b!.id] });
      expect(created.status).toBe(201);
      expect((await http().delete(`/api/v1/matches/${created.body.id}`).set(auth())).status).toBe(
        204,
      );
      expect((await manual({ posIds: [p!.id], bankIds: [b!.id] })).status).toBe(201);
    });

    it('404 para un cruce inexistente o de otra empresa', async () => {
      expect((await http().delete(`/api/v1/matches/${MISSING}`).set(auth())).status).toBe(404);
      const list = await http().get(`${base()}/matches?pageSize=1`).set(auth());
      expect(
        (await http().delete(`/api/v1/matches/${list.body.items[0].id}`).set(auth(tokenB))).status,
      ).toBe(404);
    });
  });

  describe('confirmar y rechazar propuestas', () => {
    it('confirmar: pasa a CONFIRMED con quién y cuándo, y las transacciones a MATCHED', async () => {
      const { matchId, posId, bankId } = await makeProposal();
      const res = await http()
        .patch(`/api/v1/matches/${matchId}`)
        .set(auth())
        .send({ action: 'CONFIRM' });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'CONFIRMED', confirmedBy: DEMO_USERS[1].name });
      expect(res.body.confirmedAt).not.toBeNull();
      expect((await prisma.posTransaction.findUniqueOrThrow({ where: { id: posId } })).status).toBe(
        'MATCHED',
      );
      expect((await prisma.bankMovement.findUniqueOrThrow({ where: { id: bankId } })).status).toBe(
        'MATCHED',
      );
    });

    it('confirmar con diferencia mayor que la tolerancia exige una nota', async () => {
      const { matchId } = await makeProposal('5.00');
      const noNote = await http()
        .patch(`/api/v1/matches/${matchId}`)
        .set(auth())
        .send({ action: 'CONFIRM' });
      expect(noNote.status).toBe(400);
      const withNote = await http()
        .patch(`/api/v1/matches/${matchId}`)
        .set(auth())
        .send({ action: 'CONFIRM', note: 'Diferencia por comisión' });
      expect(withNote.status).toBe(200);
      expect(withNote.body.explanation).toContain('Diferencia por comisión');
    });

    it('rechazar: pasa a REJECTED, libera las transacciones y desactiva sus items', async () => {
      const { matchId, posId, bankId } = await makeProposal();
      const res = await http()
        .patch(`/api/v1/matches/${matchId}`)
        .set(auth())
        .send({ action: 'REJECT' });
      expect(res.body.status).toBe('REJECTED');
      expect((await prisma.posTransaction.findUniqueOrThrow({ where: { id: posId } })).status).toBe(
        'PENDING',
      );
      expect((await prisma.bankMovement.findUniqueOrThrow({ where: { id: bankId } })).status).toBe(
        'PENDING',
      );
      const items = await prisma.matchItem.findMany({ where: { matchId } });
      expect(items.every((i) => !i.active)).toBe(true);
      // Las transacciones liberadas pueden cruzarse de nuevo
      expect((await manual({ posIds: [posId], bankIds: [bankId] })).status).toBe(201);
    });

    it('409 al decidir sobre un cruce que no está propuesto', async () => {
      const list = await http().get(`${base()}/matches?status=CONFIRMED&pageSize=1`).set(auth());
      const res = await http()
        .patch(`/api/v1/matches/${list.body.items[0].id}`)
        .set(auth())
        .send({ action: 'CONFIRM' });
      expect(res.status).toBe(409);
    });

    it('400 con una acción desconocida', async () => {
      const { matchId } = await makeProposal();
      expect(
        (await http().patch(`/api/v1/matches/${matchId}`).set(auth()).send({ action: 'X' })).status,
      ).toBe(400);
    });

    it('un cruce rechazado no vuelve a proponerse al re-ejecutar', async () => {
      const rid = await newReconciliation();
      const posCsv = path.join(storageDir, 'p.csv');
      const bankCsv = path.join(storageDir, 'b.csv');
      writeFileSync(
        posCsv,
        'Fecha;Hora;Local;Terminal;Lote;Autorizacion;Tarjeta;Marca;Monto;Referencia\n05/09/2026;10:00;L1;T1;B1;;;VISA;123,45;R1\n',
      );
      writeFileSync(
        bankCsv,
        'Fecha Contable,Fecha Valor,Descripcion,Referencia,Lote,Autorizacion,Tarjeta,Monto Bruto,Comision,Retencion,Monto,Tipo\n2026-09-06,2026-09-06,VENTA,X1,B9,,,,,,123.45,C\n',
      );
      await importFile(app, tokenA, rid, 'POS', posCsv, 'p.csv', 'text/csv', {
        columnMapping: POS_MAPPING,
        dateFormat: 'dd/MM/yyyy',
        decimalSeparator: ',',
      });
      await importFile(app, tokenA, rid, 'BANK', bankCsv, 'b.csv', 'text/csv', {
        columnMapping: BANK_MAPPING,
        dateFormat: 'yyyy-MM-dd',
        decimalSeparator: '.',
      });
      const first = await runAndWait(rid);
      expect(first.stats.proposed).toBe(1);
      const proposal = (
        await http()
          .get(`${base(rid)}/matches?status=PROPOSED`)
          .set(auth())
      ).body.items[0];
      await http().patch(`/api/v1/matches/${proposal.id}`).set(auth()).send({ action: 'REJECT' });

      const second = await runAndWait(rid);
      expect(second.stats.proposed).toBe(0);
      expect(second.stats.pendingPos).toBe(1);
      expect(
        await prisma.match.count({ where: { reconciliationId: rid, status: 'REJECTED' } }),
      ).toBe(1);
    });
  });

  describe('estados de la conciliación', () => {
    it('conciliación CLOSED: crear, confirmar y deshacer se rechazan', async () => {
      const closed = await newReconciliation();
      await importStandard(app, tokenA, closed);
      await runAndWait(closed);
      const pos = await prisma.posTransaction.findFirstOrThrow({
        where: { reconciliationId: closed, status: 'PENDING' },
      });
      const bank = await prisma.bankMovement.findFirstOrThrow({
        where: { reconciliationId: closed, status: 'PENDING' },
      });
      const match = await prisma.match.findFirstOrThrow({ where: { reconciliationId: closed } });
      await prisma.reconciliation.update({ where: { id: closed }, data: { status: 'CLOSED' } });

      expect((await manual({ posIds: [pos.id], bankIds: [bank.id] }, closed)).status).toBe(400);
      expect((await http().delete(`/api/v1/matches/${match.id}`).set(auth())).status).toBe(400);
      expect(
        (await http().patch(`/api/v1/matches/${match.id}`).set(auth()).send({ action: 'REJECT' }))
          .status,
      ).toBe(400);
    });

    it('conciliación en PROCESSING: las acciones manuales responden 409', async () => {
      const busy = await newReconciliation();
      await prisma.reconciliation.update({ where: { id: busy }, data: { status: 'PROCESSING' } });
      const res = await manual({ posIds: [MISSING], bankIds: [MISSING] }, busy);
      expect(res.status).toBe(409);
    });
  });
});
