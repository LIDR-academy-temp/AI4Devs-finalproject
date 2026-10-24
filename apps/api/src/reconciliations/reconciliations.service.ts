import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type ReconciliationStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateReconciliationDto } from './dto/create-reconciliation.dto.js';
import type { ListReconciliationsQuery } from './dto/list-reconciliations.query.js';
import { type ReconciliationConfig, withConfigDefaults } from './reconciliation-config.js';
import { assertTransition } from './reconciliation-state.js';

export interface ReconciliationSummary {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  status: ReconciliationStatus;
  matchedPercent: number | null;
  createdAt: Date;
}

export interface ReconciliationDetail extends ReconciliationSummary {
  config: ReconciliationConfig;
  stats: Prisma.JsonValue | null;
  completedAt: Date | null;
  files: {
    id: string;
    sourceType: string;
    originalName: string;
    status: string;
    totalRows: number;
    validRows: number;
    errorRows: number;
    createdAt: Date;
  }[];
}

/** Convierte 'YYYY-MM-DD' en fecha UTC; lanza 400 si no es un día real del calendario. */
export function parseDay(value: string, field: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException(`${field} no es una fecha válida`);
  }
  return date;
}

/** El fin del período no puede ser anterior al inicio; un solo día es válido. */
export function validatePeriod(periodStart: string, periodEnd: string): { start: Date; end: Date } {
  const start = parseDay(periodStart, 'periodStart');
  const end = parseDay(periodEnd, 'periodEnd');
  if (end < start) {
    throw new BadRequestException('periodEnd no puede ser anterior a periodStart');
  }
  return { start, end };
}

const day = (date: Date) => date.toISOString().slice(0, 10);

function matchedPercentOf(stats: Prisma.JsonValue | null): number | null {
  if (stats && typeof stats === 'object' && !Array.isArray(stats)) {
    const value = stats['matchedPercent'];
    return typeof value === 'number' ? value : null;
  }
  return null;
}

/**
 * Convención de aislamiento: `companyId` (del token) es siempre el primer argumento y forma
 * parte de todo `where`; un recurso de otra empresa responde 404.
 */
@Injectable()
export class ReconciliationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(
    companyId: string,
    userId: string,
    dto: CreateReconciliationDto,
  ): Promise<ReconciliationDetail> {
    const { start, end } = validatePeriod(dto.periodStart, dto.periodEnd);
    const config = withConfigDefaults(dto.config);
    const created = await this.prisma.reconciliation.create({
      data: {
        companyId,
        createdById: userId,
        name: dto.name,
        periodStart: start,
        periodEnd: end,
        config: config as unknown as Prisma.InputJsonValue,
      },
      include: { files: true },
    });
    return this.toDetail(created);
  }

  async list(
    companyId: string,
    query: ListReconciliationsQuery,
  ): Promise<{ items: ReconciliationSummary[]; total: number; page: number; pageSize: number }> {
    const where: Prisma.ReconciliationWhereInput = { companyId };
    if (query.status) where.status = query.status;
    // Solapamiento: periodStart ≤ to AND periodEnd ≥ from
    if (query.to) where.periodStart = { lte: parseDay(query.to, 'to') };
    if (query.from) where.periodEnd = { gte: parseDay(query.from, 'from') };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.reconciliation.count({ where }),
      this.prisma.reconciliation.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items: rows.map((row) => this.toSummary(row)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findOne(companyId: string, id: string): Promise<ReconciliationDetail> {
    const row = await this.prisma.reconciliation.findFirst({
      where: { id, companyId },
      include: { files: { orderBy: { createdAt: 'asc' } } },
    });
    if (!row) throw new NotFoundException('Conciliación no encontrada');
    return this.toDetail(row);
  }

  /**
   * Única vía para cambiar el estado (la usan el motor y el cierre). Valida la transición y
   * actualiza de forma condicional al estado leído para no pisar un cambio concurrente.
   */
  async changeStatus(
    companyId: string,
    id: string,
    to: ReconciliationStatus,
  ): Promise<ReconciliationDetail> {
    const current = await this.prisma.reconciliation.findFirst({ where: { id, companyId } });
    if (!current) throw new NotFoundException('Conciliación no encontrada');
    assertTransition(current.status, to);

    const { count } = await this.prisma.reconciliation.updateMany({
      where: { id, companyId, status: current.status },
      data: { status: to, ...(to === 'COMPLETED' ? { completedAt: new Date() } : {}) },
    });
    if (count === 0) {
      throw new BadRequestException('El estado cambió mientras se procesaba la solicitud');
    }
    return this.findOne(companyId, id);
  }

  private toSummary(row: {
    id: string;
    name: string;
    periodStart: Date;
    periodEnd: Date;
    status: ReconciliationStatus;
    stats: Prisma.JsonValue | null;
    createdAt: Date;
  }): ReconciliationSummary {
    return {
      id: row.id,
      name: row.name,
      periodStart: day(row.periodStart),
      periodEnd: day(row.periodEnd),
      status: row.status,
      matchedPercent: matchedPercentOf(row.stats),
      createdAt: row.createdAt,
    };
  }

  private toDetail(
    row: Parameters<ReconciliationsService['toSummary']>[0] & {
      config: Prisma.JsonValue;
      completedAt: Date | null;
      files: ReconciliationDetail['files'];
    },
  ): ReconciliationDetail {
    return {
      ...this.toSummary(row),
      config: withConfigDefaults(row.config as Partial<ReconciliationConfig>),
      stats: row.stats,
      completedAt: row.completedAt,
      files: row.files.map((f) => ({
        id: f.id,
        sourceType: f.sourceType,
        originalName: f.originalName,
        status: f.status,
        totalRows: f.totalRows,
        validRows: f.validRows,
        errorRows: f.errorRows,
        createdAt: f.createdAt,
      })),
    };
  }
}
