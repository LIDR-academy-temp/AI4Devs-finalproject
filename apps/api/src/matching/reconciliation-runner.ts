import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type ReconciliationConfig,
  withConfigDefaults,
} from '../reconciliations/reconciliation-config.js';
import { MatchingEngine, type BankMov, type MatchCandidate, type PosTxn } from './engine/index.js';
import { StoreMappingsService } from './store-mappings/store-mappings.service.js';
import { normalizeStoreName } from './store-mappings/store-name.js';

export const INTERRUPTED_MESSAGE = 'Ejecución interrumpida por un reinicio del servidor';

const day = (date: Date) => date.toISOString().slice(0, 10);
const dec = (value: Prisma.Decimal | null) =>
  value === null ? null : new Decimal(value.toString());

type Tx = Prisma.TransactionClient;

/**
 * Carga las transacciones pendientes, invoca el motor y guarda los resultados en una sola
 * transacción. Interfaz `run(id)` pensada para moverse a un worker sin tocar la API.
 */
@Injectable()
export class ReconciliationRunner implements OnModuleInit {
  private readonly logger = new Logger(ReconciliationRunner.name);
  private readonly engine = new MatchingEngine();

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StoreMappingsService) private readonly storeMappings: StoreMappingsService,
  ) {}

  /** Una ejecución que se quedó en PROCESSING tras una caída pasa a FAILED. */
  async onModuleInit(): Promise<void> {
    const stuck = await this.prisma.reconciliation.findMany({
      where: { status: 'PROCESSING' },
      select: { id: true, stats: true },
    });
    for (const row of stuck) {
      await this.markFailed(row.id, INTERRUPTED_MESSAGE, row.stats);
    }
  }

  /** Ejecuta sin lanzar: ante cualquier error revierte y deja la conciliación en FAILED. */
  async run(reconciliationId: string, companyId: string, userId: string): Promise<void> {
    try {
      const mappings = await this.storeMappings.asMap(companyId);
      await this.prisma.$transaction((tx) => this.execute(tx, reconciliationId, userId, mappings), {
        timeout: 120_000,
        maxWait: 10_000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Fallo al ejecutar ${reconciliationId}: ${message}`);
      const row = await this.prisma.reconciliation.findUnique({
        where: { id: reconciliationId },
        select: { stats: true },
      });
      await this.markFailed(reconciliationId, message, row?.stats ?? null);
    }
  }

  private async markFailed(id: string, message: string, previous: Prisma.JsonValue | null) {
    const base =
      previous && typeof previous === 'object' && !Array.isArray(previous) ? previous : {};
    await this.prisma.reconciliation.update({
      where: { id },
      data: { status: 'FAILED', stats: { ...base, error: message } as Prisma.InputJsonValue },
    });
  }

  private async execute(
    tx: Tx,
    id: string,
    userId: string,
    mappings: Map<string, string>,
  ): Promise<void> {
    const reconciliation = await tx.reconciliation.findUniqueOrThrow({ where: { id } });
    const config = withConfigDefaults(reconciliation.config as Partial<ReconciliationConfig>);

    await this.clearAutomaticMatches(tx, id);

    const [posRows, bankRows] = await Promise.all([
      tx.posTransaction.findMany({ where: { reconciliationId: id, status: 'PENDING' } }),
      tx.bankMovement.findMany({ where: { reconciliationId: id, status: 'PENDING' } }),
    ]);
    const unmapped = new Set<string>();
    const pos: PosTxn[] = posRows.map((r) => {
      const name = normalizeStoreName(r.storeCode);
      const bankStoreCode = name === null ? null : (mappings.get(name) ?? null);
      if (name !== null && bankStoreCode === null) unmapped.add(name);
      return {
        id: r.id,
        date: day(r.transactionAt),
        amount: new Decimal(r.amount.toString()),
        cardLast4: r.cardLast4,
        authCode: r.authCode,
        batchNumber: r.batchNumber,
        reference: r.reference,
        bankStoreCode,
      };
    });
    const bank: BankMov[] = bankRows.map((r) => ({
      id: r.id,
      date: day(r.postedAt),
      amount: new Decimal(r.amount.toString()),
      grossAmount: dec(r.grossAmount),
      cardLast4: r.cardLast4,
      authCode: r.authCode,
      batchNumber: r.batchNumber,
      reference: r.reference,
      storeCode: r.storeCode?.trim() || null,
    }));

    const candidates = this.engine.run({ pos, bank }, config);
    await this.persist(tx, id, candidates);

    const stats = await this.computeStats(tx, id, userId, config, [...unmapped].sort());
    await tx.reconciliation.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        stats: stats as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Borra los cruces automáticos que ningún usuario confirmó y devuelve sus transacciones a
   * PENDING; los manuales y los aceptados por una persona (`confirmedById`) se conservan.
   */
  private async clearAutomaticMatches(tx: Tx, id: string): Promise<void> {
    const stale = await tx.match.findMany({
      where: {
        reconciliationId: id,
        method: { not: 'MANUAL' },
        confirmedById: null,
        status: { in: ['CONFIRMED', 'PROPOSED'] },
      },
      select: { id: true },
    });
    if (stale.length === 0) return;
    const matchIds = stale.map((m) => m.id);
    const items = await tx.matchItem.findMany({ where: { matchId: { in: matchIds } } });
    const posIds = items.map((i) => i.posTransactionId).filter((v): v is string => v !== null);
    const bankIds = items.map((i) => i.bankMovementId).filter((v): v is string => v !== null);
    await tx.match.deleteMany({ where: { id: { in: matchIds } } });
    await tx.posTransaction.updateMany({
      where: { id: { in: posIds }, status: { in: ['MATCHED', 'PROPOSED'] } },
      data: { status: 'PENDING' },
    });
    await tx.bankMovement.updateMany({
      where: { id: { in: bankIds }, status: { in: ['MATCHED', 'PROPOSED'] } },
      data: { status: 'PENDING' },
    });
  }

  private async persist(tx: Tx, id: string, candidates: MatchCandidate[]): Promise<void> {
    const BATCH = 1000;
    const now = new Date();
    const rows = candidates.map((c) => ({ id: randomUUID(), c }));
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      await tx.match.createMany({
        data: chunk.map(({ id: matchId, c }) => ({
          id: matchId,
          reconciliationId: id,
          method: c.method,
          cardinality: c.cardinality,
          status: c.status,
          confidence: c.confidence,
          posTotal: c.posTotal.toFixed(2),
          bankTotal: c.bankTotal.toFixed(2),
          difference: c.difference.toFixed(2),
          explanation: c.explanation,
          confirmedAt: c.status === 'CONFIRMED' ? now : null,
        })),
      });
      await tx.matchItem.createMany({
        data: chunk.flatMap(({ id: matchId, c }) => [
          ...c.posIds.map((posTransactionId) => ({ matchId, posTransactionId })),
          ...c.bankIds.map((bankMovementId) => ({ matchId, bankMovementId })),
        ]),
      });
    }
    const byStatus = (status: 'CONFIRMED' | 'PROPOSED') =>
      candidates.filter((c) => c.status === status);
    for (const [status, txStatus] of [
      ['CONFIRMED', 'MATCHED'],
      ['PROPOSED', 'PROPOSED'],
    ] as const) {
      const group = byStatus(status);
      if (group.length === 0) continue;
      await tx.posTransaction.updateMany({
        where: { id: { in: group.flatMap((c) => c.posIds) } },
        data: { status: txStatus },
      });
      await tx.bankMovement.updateMany({
        where: { id: { in: group.flatMap((c) => c.bankIds) } },
        data: { status: txStatus },
      });
    }
  }

  private async computeStats(
    tx: Tx,
    id: string,
    userId: string,
    config: ReconciliationConfig,
    unmappedStores: string[],
  ) {
    const [posAgg, bankAgg, posByStatus, bankByStatus, matches] = await Promise.all([
      tx.posTransaction.aggregate({
        where: { reconciliationId: id },
        _count: true,
        _sum: { amount: true },
      }),
      tx.bankMovement.aggregate({
        where: { reconciliationId: id },
        _count: true,
        _sum: { amount: true },
      }),
      tx.posTransaction.groupBy({ by: ['status'], where: { reconciliationId: id }, _count: true }),
      tx.bankMovement.groupBy({ by: ['status'], where: { reconciliationId: id }, _count: true }),
      tx.match.groupBy({
        by: ['method', 'status'],
        where: { reconciliationId: id },
        _count: true,
        _sum: { difference: true },
      }),
    ]);
    const countOf = (rows: { status: string; _count: number }[], status: string) =>
      rows.find((r) => r.status === status)?._count ?? 0;

    const matchedByMethod: Record<string, number> = {};
    let proposed = 0;
    let totalDifference = new Decimal(0);
    for (const m of matches) {
      if (m.status === 'CONFIRMED') {
        matchedByMethod[m.method] = (matchedByMethod[m.method] ?? 0) + m._count;
        totalDifference = totalDifference.plus(m._sum.difference?.toString() ?? '0');
      } else if (m.status === 'PROPOSED') {
        proposed += m._count;
      }
    }
    const posCount = posAgg._count;
    const matchedPos = countOf(posByStatus, 'MATCHED');
    return {
      posCount,
      posTotal: (posAgg._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      bankCount: bankAgg._count,
      bankTotal: (bankAgg._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      matchedByMethod,
      pendingPos: countOf(posByStatus, 'PENDING'),
      pendingBank: countOf(bankByStatus, 'PENDING'),
      proposed,
      exceptions: countOf(posByStatus, 'EXCEPTION') + countOf(bankByStatus, 'EXCEPTION'),
      matchedPercent: posCount === 0 ? 0 : Math.round((matchedPos / posCount) * 1000) / 10,
      totalDifference: totalDifference.toFixed(2),
      unmappedStores,
      lastRunAt: new Date().toISOString(),
      lastRunBy: userId,
      config,
    };
  }
}
