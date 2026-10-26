/**
 * Integración de reconciliation-management: crear, listar (filtros, paginación, orden),
 * detalle, aislamiento por empresa y cambios de estado del servicio.
 */
import { execSync } from 'node:child_process';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { validateEnv, type Env } from '../src/config/env.schema.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { ReconciliationsService } from '../src/reconciliations/reconciliations.service.js';
import { DEFAULT_PASSWORD, DEMO_USERS, runSeed } from '../prisma/seed-data.js';
import { expectForeignResourceIsNotFound } from './helpers/tenant-isolation.js';

const OTHER_EMAIL = 'otro-rec@empresa-b.test';
const OTHER_TAX_ID = '0777777777001';
const PREFIX = 'INT-REC';

describe('Conciliaciones', () => {
  let prisma: PrismaClient;
  let app: INestApplication;
  let tokenA: string;
  let tokenB: string;
  let foreignId: string;
  const http = () => request(app.getHttpServer());
  const auth = (token = tokenA) => ({ Authorization: `Bearer ${token}` });

  const login = async (email: string) =>
    (await http().post('/api/v1/auth/login').send({ email, password: DEFAULT_PASSWORD })).body
      .accessToken as string;

  const create = (body: Record<string, unknown>, token = tokenA) =>
    http().post('/api/v1/reconciliations').set(auth(token)).send(body);

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

    const values = validateEnv(process.env);
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue({ get: (key: keyof Env) => values[key] })
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    tokenA = await login(DEMO_USERS[1].email);
    tokenB = await login(OTHER_EMAIL);
    foreignId = (
      await create(
        { name: `${PREFIX} ajena`, periodStart: '2026-08-01', periodEnd: '2026-08-31' },
        tokenB,
      )
    ).body.id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
    await prisma.user.deleteMany({ where: { email: OTHER_EMAIL } });
    await prisma.company.deleteMany({ where: { taxId: OTHER_TAX_ID } });
    await prisma.$disconnect();
  });

  describe('POST /reconciliations', () => {
    it('crea en DRAFT con defaults, empresa y creador tomados del token', async () => {
      const res = await create({
        name: `  ${PREFIX} Diners agosto  `,
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
        companyId: 'ignorado', // el cliente no decide la empresa
      });
      // companyId no está en el DTO: forbidNonWhitelisted lo rechaza en lugar de aceptarlo
      expect(res.status).toBe(400);

      const ok = await create({
        name: `  ${PREFIX} Diners agosto  `,
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
      });
      expect(ok.status).toBe(201);
      expect(ok.body).toMatchObject({
        name: `${PREFIX} Diners agosto`,
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
        status: 'DRAFT',
        matchedPercent: null,
        config: {
          dateWindowDays: 3,
          amountTolerance: 0.05,
          feePercent: 0,
          withholdingPercent: 0,
          enableGrouping: true,
        },
        files: [],
      });

      const row = await prisma.reconciliation.findUniqueOrThrow({ where: { id: ok.body.id } });
      const user = await prisma.user.findUniqueOrThrow({ where: { email: DEMO_USERS[1].email } });
      expect(row.companyId).toBe(user.companyId);
      expect(row.createdById).toBe(user.id);
    });

    it('guarda los parámetros indicados y completa el resto', async () => {
      const res = await create({
        name: `${PREFIX} parámetros`,
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
        config: { dateWindowDays: 5, enableGrouping: false, feePercent: 3.21 },
      });
      expect(res.status).toBe(201);
      expect(res.body.config).toEqual({
        dateWindowDays: 5,
        amountTolerance: 0.05,
        feePercent: 3.21,
        withholdingPercent: 0,
        enableGrouping: false,
      });
    });

    it('acepta un período de un solo día', async () => {
      const res = await create({
        name: `${PREFIX} un día`,
        periodStart: '2026-08-15',
        periodEnd: '2026-08-15',
      });
      expect(res.status).toBe(201);
    });

    it.each([
      ['nombre vacío', { name: '' }, 'name'],
      ['nombre en blanco', { name: '   ' }, 'name'],
      ['sin nombre', { name: undefined }, 'name'],
      [
        'fin anterior a inicio',
        { periodStart: '2026-08-31', periodEnd: '2026-08-01' },
        'periodEnd',
      ],
      ['fecha inexistente', { periodStart: '2026-02-30' }, 'periodStart'],
      ['formato de fecha', { periodEnd: '31/08/2026' }, 'periodEnd'],
      ['ventana negativa', { config: { dateWindowDays: -1 } }, 'dateWindowDays'],
      ['tolerancia negativa', { config: { amountTolerance: -0.01 } }, 'amountTolerance'],
      ['comisión > 100', { config: { feePercent: 101 } }, 'feePercent'],
      ['retención negativa', { config: { withholdingPercent: -5 } }, 'withholdingPercent'],
    ])('rechaza con 400 que identifica el campo: %s', async (_caso, cambio, campo) => {
      const res = await create({
        name: `${PREFIX} inválida`,
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
        ...cambio,
      });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.message)).toContain(campo);
      expect(await prisma.reconciliation.count({ where: { name: `${PREFIX} inválida` } })).toBe(0);
    });

    it('401 sin token', async () => {
      expect((await http().post('/api/v1/reconciliations').send({})).status).toBe(401);
    });
  });

  describe('GET /reconciliations', () => {
    const names = ['A', 'B', 'C'].map((n) => `${PREFIX} lista ${n}`);

    beforeAll(async () => {
      // Se crean en orden para comprobar el orden por fecha de creación descendente
      await create({ name: names[0], periodStart: '2026-01-01', periodEnd: '2026-01-31' });
      await create({ name: names[1], periodStart: '2026-02-01', periodEnd: '2026-02-28' });
      await create({ name: names[2], periodStart: '2026-03-01', periodEnd: '2026-03-31' });
      const b = await prisma.reconciliation.findFirstOrThrow({ where: { name: names[1] } });
      await prisma.reconciliation.update({
        where: { id: b.id },
        data: { status: 'COMPLETED', stats: { matchedPercent: 92.5 } },
      });
    });

    const list = (qs = '') => http().get(`/api/v1/reconciliations${qs}`).set(auth());

    it('solo devuelve conciliaciones de la empresa, de la más reciente a la más antigua', async () => {
      const res = await list('?pageSize=100');
      expect(res.status).toBe(200);
      expect(res.body.items.map((i: { id: string }) => i.id)).not.toContain(foreignId);
      const dates = res.body.items.map((i: { createdAt: string }) => i.createdAt);
      expect(dates).toEqual([...dates].sort().reverse());
      expect(res.body).toMatchObject({ page: 1, pageSize: 100 });
    });

    it('expone nombre, período, estado, porcentaje conciliado y fecha de creación', async () => {
      const res = await list('?status=COMPLETED');
      const item = res.body.items.find((i: { name: string }) => i.name === names[1]);
      expect(item).toMatchObject({
        name: names[1],
        periodStart: '2026-02-01',
        periodEnd: '2026-02-28',
        status: 'COMPLETED',
        matchedPercent: 92.5,
      });
      expect(item.createdAt).toEqual(expect.any(String));
      expect(res.body.items.every((i: { status: string }) => i.status === 'COMPLETED')).toBe(true);
    });

    it('filtra por solapamiento de período', async () => {
      const res = await list('?from=2026-02-15&to=2026-03-05&pageSize=100');
      const found = res.body.items
        .map((i: { name: string }) => i.name)
        .filter((n: string) => n.startsWith(`${PREFIX} lista`));
      expect(found.sort()).toEqual([names[1], names[2]]);
    });

    it('pagina con page y pageSize', async () => {
      const first = await list('?pageSize=2&page=1');
      const second = await list('?pageSize=2&page=2');
      expect(first.body.items).toHaveLength(2);
      expect(first.body.total).toBeGreaterThanOrEqual(5);
      const ids = [...first.body.items, ...second.body.items].map((i: { id: string }) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it.each(['?pageSize=101', '?page=0', '?status=NOPE', '?from=hoy'])(
      'rechaza parámetros inválidos %s con 400',
      async (qs) => {
        expect((await list(qs)).status).toBe(400);
      },
    );
  });

  describe('GET /reconciliations/:id', () => {
    it('devuelve el detalle con parámetros, archivos y estadísticas', async () => {
      const created = await create({
        name: `${PREFIX} detalle`,
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
      });
      await prisma.importedFile.create({
        data: {
          reconciliationId: created.body.id,
          sourceType: 'POS',
          originalName: 'pos.xlsx',
          storagePath: 'x',
          sha256: 'a'.repeat(64),
          totalRows: 10,
        },
      });
      const res = await http().get(`/api/v1/reconciliations/${created.body.id}`).set(auth());
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: `${PREFIX} detalle`, status: 'DRAFT', stats: null });
      expect(res.body.config.dateWindowDays).toBe(3);
      expect(res.body.files).toEqual([
        expect.objectContaining({ originalName: 'pos.xlsx', sourceType: 'POS', totalRows: 10 }),
      ]);
    });

    it('400 con un identificador que no es UUID', async () => {
      expect((await http().get('/api/v1/reconciliations/abc').set(auth())).status).toBe(400);
    });

    it('una conciliación de otra empresa responde igual que una inexistente (404)', async () => {
      await expectForeignResourceIsNotFound({
        app,
        tokenCompanyA: tokenA,
        foreignResourcePath: `/api/v1/reconciliations/${foreignId}`,
        missingResourcePath: '/api/v1/reconciliations/00000000-0000-4000-8000-000000000000',
      });
    });
  });

  describe('changeStatus', () => {
    it('aplica las transiciones válidas, rechaza las inválidas y respeta la empresa', async () => {
      const service = app.get(ReconciliationsService);
      const user = await prisma.user.findUniqueOrThrow({ where: { email: DEMO_USERS[1].email } });
      const { body } = await create({
        name: `${PREFIX} estados`,
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
      });

      await expect(service.changeStatus(user.companyId, body.id, 'COMPLETED')).rejects.toThrow(
        /DRAFT → COMPLETED/,
      );
      expect((await service.changeStatus(user.companyId, body.id, 'PROCESSING')).status).toBe(
        'PROCESSING',
      );
      const done = await service.changeStatus(user.companyId, body.id, 'COMPLETED');
      expect(done.completedAt).not.toBeNull();
      expect((await service.changeStatus(user.companyId, body.id, 'CLOSED')).status).toBe('CLOSED');
      await expect(service.changeStatus(user.companyId, body.id, 'PROCESSING')).rejects.toThrow(
        /CLOSED → PROCESSING/,
      );
      await expect(service.changeStatus(user.companyId, foreignId, 'PROCESSING')).rejects.toThrow(
        /no encontrada/,
      );
    });
  });
});
