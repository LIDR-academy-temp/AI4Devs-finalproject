import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { MatchesQuery, TransactionsQuery } from './dto/results.dto.js';
import { computeStatsCounts } from './stats.js';

const dayStart = (value: string) => new Date(`${value}T00:00:00.000Z`);
const dayAfter = (value: string) => new Date(dayStart(value).getTime() + 86_400_000);
const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

const posSelect = {
  id: true,
  rowNumber: true,
  transactionAt: true,
  amount: true,
  cardLast4: true,
  authCode: true,
  cardBrand: true,
  batchNumber: true,
  reference: true,
  storeCode: true,
  status: true,
  rawData: true,
} satisfies Prisma.PosTransactionSelect;

const bankSelect = {
  id: true,
  rowNumber: true,
  postedAt: true,
  valueDate: true,
  amount: true,
  grossAmount: true,
  cardLast4: true,
  authCode: true,
  batchNumber: true,
  reference: true,
  storeCode: true,
  description: true,
  status: true,
  rawData: true,
} satisfies Prisma.BankMovementSelect;

type PosRow = Prisma.PosTransactionGetPayload<{ select: typeof posSelect }>;
type BankRow = Prisma.BankMovementGetPayload<{ select: typeof bankSelect }>;

export const posView = (t: PosRow) => ({
  ...t,
  transactionAt: t.transactionAt.toISOString(),
  amount: t.amount.toFixed(2),
});
export const bankView = (t: BankRow) => ({
  ...t,
  postedAt: iso(t.postedAt),
  valueDate: iso(t.valueDate),
  amount: t.amount.toFixed(2),
  grossAmount: t.grossAmount?.toFixed(2) ?? null,
});

export const matchInclude = {
  items: {
    include: {
      posTransaction: { select: posSelect },
      bankMovement: { select: bankSelect },
    },
  },
  createdBy: { select: { name: true } },
  confirmedBy: { select: { name: true } },
} satisfies Prisma.MatchInclude;

type MatchRow = Prisma.MatchGetPayload<{ include: typeof matchInclude }>;

export const matchView = (m: MatchRow) => ({
  id: m.id,
  method: m.method,
  cardinality: m.cardinality,
  status: m.status,
  confidence: Number(m.confidence),
  posTotal: m.posTotal.toFixed(2),
  bankTotal: m.bankTotal.toFixed(2),
  difference: m.difference.toFixed(2),
  explanation: m.explanation,
  createdBy: m.createdBy?.name ?? null,
  confirmedBy: m.confirmedBy?.name ?? null,
  createdAt: m.createdAt.toISOString(),
  confirmedAt: m.confirmedAt?.toISOString() ?? null,
  posTransactions: m.items.flatMap((i) => (i.posTransaction ? [posView(i.posTransaction)] : [])),
  bankMovements: m.items.flatMap((i) => (i.bankMovement ? [bankView(i.bankMovement)] : [])),
});

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Convención de aislamiento: `companyId` (del token) es siempre el primer argumento. */
@Injectable()
export class ResultsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async assertOwned(companyId: string, reconciliationId: string): Promise<void> {
    const found = await this.prisma.reconciliation.findFirst({
      where: { id: reconciliationId, companyId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Conciliación no encontrada');
  }

  /** Indicadores en vivo (siempre coherentes con las transacciones y cruces actuales). */
  async summary(companyId: string, reconciliationId: string) {
    await this.assertOwned(companyId, reconciliationId);
    return computeStatsCounts(this.prisma, reconciliationId);
  }

  async listPos(companyId: string, reconciliationId: string, q: TransactionsQuery) {
    await this.assertOwned(companyId, reconciliationId);
    const where: Prisma.PosTransactionWhereInput = { reconciliationId };
    if (q.status) where.status = q.status;
    if (q.dateFrom || q.dateTo) {
      where.transactionAt = {
        ...(q.dateFrom ? { gte: dayStart(q.dateFrom) } : {}),
        ...(q.dateTo ? { lt: dayAfter(q.dateTo) } : {}),
      };
    }
    if (q.amountMin !== undefined || q.amountMax !== undefined) {
      where.amount = { gte: q.amountMin, lte: q.amountMax };
    }
    if (q.brand) where.cardBrand = { equals: q.brand, mode: 'insensitive' };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.posTransaction.count({ where }),
      this.prisma.posTransaction.findMany({
        where,
        select: posSelect,
        orderBy: [{ transactionAt: 'asc' }, { rowNumber: 'asc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    return { items: rows.map(posView), total, page: q.page, pageSize: q.pageSize };
  }

  async listBank(companyId: string, reconciliationId: string, q: TransactionsQuery) {
    await this.assertOwned(companyId, reconciliationId);
    const where: Prisma.BankMovementWhereInput = { reconciliationId };
    if (q.status) where.status = q.status;
    if (q.dateFrom || q.dateTo) {
      where.postedAt = {
        ...(q.dateFrom ? { gte: dayStart(q.dateFrom) } : {}),
        ...(q.dateTo ? { lte: dayStart(q.dateTo) } : {}),
      };
    }
    if (q.amountMin !== undefined || q.amountMax !== undefined) {
      where.amount = { gte: q.amountMin, lte: q.amountMax };
    }
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.bankMovement.count({ where }),
      this.prisma.bankMovement.findMany({
        where,
        select: bankSelect,
        orderBy: [{ postedAt: 'asc' }, { rowNumber: 'asc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    return { items: rows.map(bankView), total, page: q.page, pageSize: q.pageSize };
  }

  async listMatches(companyId: string, reconciliationId: string, q: MatchesQuery) {
    await this.assertOwned(companyId, reconciliationId);
    const where: Prisma.MatchWhereInput = { reconciliationId };
    if (q.method) where.method = q.method;
    if (q.status) where.status = q.status;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.match.count({ where }),
      this.prisma.match.findMany({
        where,
        include: matchInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    return { items: rows.map(matchView), total, page: q.page, pageSize: q.pageSize };
  }
}
