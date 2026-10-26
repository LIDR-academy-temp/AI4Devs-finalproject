import { Decimal } from 'decimal.js';
import { Prisma } from '../generated/prisma/client.js';

type Db = Prisma.TransactionClient;

const money = (value: Prisma.Decimal | null | undefined) =>
  (value ?? new Prisma.Decimal(0)).toFixed(2);

/**
 * Indicadores de una conciliación calculados con agregaciones SQL sobre el estado actual;
 * única fuente para el motor, las acciones manuales y el resumen del panel.
 */
export async function computeStatsCounts(db: Db, reconciliationId: string) {
  const where = { reconciliationId };
  const [posAgg, bankAgg, posByStatus, bankByStatus, matches] = await Promise.all([
    db.posTransaction.aggregate({ where, _count: true, _sum: { amount: true } }),
    db.bankMovement.aggregate({ where, _count: true, _sum: { amount: true } }),
    db.posTransaction.groupBy({ by: ['status'], where, _count: true, _sum: { amount: true } }),
    db.bankMovement.groupBy({ by: ['status'], where, _count: true, _sum: { amount: true } }),
    db.match.groupBy({
      by: ['method', 'status'],
      where,
      _count: true,
      _sum: { difference: true },
    }),
  ]);
  const of = (rows: { status: string; _count: number }[], status: string) =>
    rows.find((r) => r.status === status)?._count ?? 0;
  const totalOf = (
    rows: { status: string; _sum: { amount: Prisma.Decimal | null } }[],
    status: string,
  ) => money(rows.find((r) => r.status === status)?._sum.amount);

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
  const matchedPos = of(posByStatus, 'MATCHED');
  return {
    posCount,
    posTotal: money(posAgg._sum.amount),
    bankCount: bankAgg._count,
    bankTotal: money(bankAgg._sum.amount),
    matchedByMethod,
    matchedPos,
    matchedBank: of(bankByStatus, 'MATCHED'),
    pendingPos: of(posByStatus, 'PENDING'),
    pendingPosTotal: totalOf(posByStatus, 'PENDING'),
    pendingBank: of(bankByStatus, 'PENDING'),
    pendingBankTotal: totalOf(bankByStatus, 'PENDING'),
    proposed,
    exceptions: of(posByStatus, 'EXCEPTION') + of(bankByStatus, 'EXCEPTION'),
    matchedPercent: posCount === 0 ? 0 : Math.round((matchedPos / posCount) * 1000) / 10,
    totalDifference: totalDifference.toFixed(2),
  };
}

/** Recalcula y guarda los indicadores conservando los datos de la última ejecución. */
export async function recomputeStats(db: Db, reconciliationId: string): Promise<void> {
  const row = await db.reconciliation.findUniqueOrThrow({
    where: { id: reconciliationId },
    select: { stats: true },
  });
  const previous =
    row.stats && typeof row.stats === 'object' && !Array.isArray(row.stats) ? row.stats : {};
  const counts = await computeStatsCounts(db, reconciliationId);
  await db.reconciliation.update({
    where: { id: reconciliationId },
    data: { stats: { ...previous, ...counts } as Prisma.InputJsonValue },
  });
}
