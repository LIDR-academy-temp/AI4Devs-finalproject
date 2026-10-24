/**
 * Test de integración de la base de datos (TK-02 / spec dev-environment).
 * Aplica las migraciones sobre la base de datos de test, ejecuta el seed dos veces
 * y comprueba entidades, tipos decimales, restricción CHECK y cierre limpio de PrismaService.
 */
import { execSync } from 'node:child_process';

import { PrismaPg } from '@prisma/adapter-pg';
import type { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import type { Env } from '../src/config/env.schema.js';
import { DEMO_COMPANY, DEMO_USERS, runSeed } from '../prisma/seed-data.js';

const TABLAS_ESPERADAS = [
  'audit_logs',
  'bank_movements',
  'companies',
  'import_templates',
  'imported_files',
  'match_items',
  'matches',
  'pos_transactions',
  'reconciliations',
  'users',
];

describe('Base de datos: migraciones, seed y restricciones', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    // DATABASE_URL ya apunta a la base de test (ver test/setup-env.ts)
    execSync('npx prisma migrate deploy', { stdio: 'pipe', env: process.env });
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
    await prisma.$connect();
    await runSeed(prisma);
    await runSeed(prisma); // segunda ejecución: debe ser idempotente
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('crea todas las tablas del modelo', async () => {
    const filas = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'
      ORDER BY table_name`;
    expect(filas.map((f) => f.table_name)).toEqual(TABLAS_ESPERADAS);
  });

  it('almacena los montos como decimal(14,2), nunca como coma flotante', async () => {
    const filas = await prisma.$queryRaw<
      { table_name: string; column_name: string; data_type: string; p: number; s: number }[]
    >`
      SELECT table_name, column_name, data_type,
             numeric_precision::int AS p, numeric_scale::int AS s
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name IN ('amount','gross_amount','fee_amount','withholding_amount',
                            'pos_total','bank_total','difference')`;
    expect(filas.length).toBeGreaterThan(0);
    for (const fila of filas) {
      expect(fila.data_type).toBe('numeric');
      expect(fila.p).toBe(14);
      expect(fila.s).toBe(2);
    }
  });

  it('el seed es idempotente: una empresa y dos usuarios tras ejecutarlo dos veces', async () => {
    expect(await prisma.company.count({ where: { taxId: DEMO_COMPANY.taxId } })).toBe(1);
    const usuarios = await prisma.user.findMany({
      where: { email: { in: DEMO_USERS.map((u) => u.email) } },
      orderBy: { role: 'asc' },
    });
    expect(usuarios).toHaveLength(2);
    expect(usuarios.map((u) => u.role).sort()).toEqual(['ADMIN', 'ANALYST']);
    expect(usuarios.every((u) => u.active)).toBe(true);
  });

  it('las contraseñas se guardan como hash bcrypt, nunca en texto plano', async () => {
    const usuario = await prisma.user.findUniqueOrThrow({ where: { email: DEMO_USERS[0].email } });
    expect(usuario.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(usuario.passwordHash).not.toContain('Concilia2026');
  });

  describe('restricción CHECK de match_items (exactamente un lado)', () => {
    let reconciliationId: string;
    let matchId: string;

    beforeAll(async () => {
      const admin = await prisma.user.findUniqueOrThrow({ where: { email: DEMO_USERS[0].email } });
      const reconciliation = await prisma.reconciliation.create({
        data: {
          companyId: admin.companyId,
          createdById: admin.id,
          name: 'Test CHECK match_items',
          periodStart: new Date('2026-09-01'),
          periodEnd: new Date('2026-09-30'),
          config: { dateWindowDays: 3, amountTolerance: 0.05 },
        },
      });
      reconciliationId = reconciliation.id;
      const match = await prisma.match.create({
        data: {
          reconciliationId,
          method: 'MANUAL',
          cardinality: 'ONE_TO_ONE',
          status: 'CONFIRMED',
          confidence: new Prisma.Decimal(1),
          posTotal: new Prisma.Decimal('10.00'),
          bankTotal: new Prisma.Decimal('10.00'),
          difference: new Prisma.Decimal('0.00'),
        },
      });
      matchId = match.id;
    });

    afterAll(async () => {
      await prisma.reconciliation.delete({ where: { id: reconciliationId } }); // cascada
    });

    it('rechaza un detalle sin transacción POS ni movimiento bancario', async () => {
      await expect(
        prisma.$executeRaw`INSERT INTO match_items (id, match_id) VALUES (gen_random_uuid(), ${matchId}::uuid)`,
      ).rejects.toThrow(/match_items_exactly_one_side_check/);
    });

    it('rechaza un detalle con ambos lados informados', async () => {
      const [pos] = await prisma.$queryRaw<{ id: string }[]>`SELECT gen_random_uuid() AS id`;
      await expect(
        prisma.$executeRaw`
          INSERT INTO match_items (id, match_id, pos_transaction_id, bank_movement_id)
          VALUES (gen_random_uuid(), ${matchId}::uuid, ${pos.id}::uuid, ${pos.id}::uuid)`,
      ).rejects.toThrow(/match_items_exactly_one_side_check|foreign key/);
    });

    it('rechaza una confianza fuera de 0..1', async () => {
      await expect(
        prisma.match.create({
          data: {
            reconciliationId,
            method: 'EXACT',
            cardinality: 'ONE_TO_ONE',
            status: 'CONFIRMED',
            confidence: new Prisma.Decimal('1.5'),
            posTotal: new Prisma.Decimal(0),
            bankTotal: new Prisma.Decimal(0),
            difference: new Prisma.Decimal(0),
          },
        }),
      ).rejects.toThrow(/matches_confidence_range_check/);
    });
  });

  it('PrismaService conecta al iniciar y cierra la conexión al destruir el módulo', async () => {
    const config = {
      get: (key: string) => (key === 'DATABASE_URL' ? process.env.DATABASE_URL : 'test'),
    } as unknown as ConfigService<Env, true>;
    const service = new PrismaService(config);
    await service.onModuleInit();
    const [fila] = await service.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;
    expect(Number(fila.ok)).toBe(1);
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });
});
