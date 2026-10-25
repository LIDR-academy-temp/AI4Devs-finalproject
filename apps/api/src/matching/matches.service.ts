import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { Prisma, type MatchCardinality } from '../generated/prisma/client.js';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type ReconciliationConfig,
  withConfigDefaults,
} from '../reconciliations/reconciliation-config.js';
import type { CreateManualMatchDto, DecideMatchDto } from './dto/results.dto.js';
import { matchInclude, matchView } from './results.service.js';
import { recomputeStats } from './stats.js';

type Tx = Prisma.TransactionClient;

const unique = (ids: string[]) => [...new Set(ids)];

export function cardinalityOf(posCount: number, bankCount: number): MatchCardinality {
  if (posCount === 1 && bankCount === 1) return 'ONE_TO_ONE';
  if (bankCount === 1) return 'MANY_TO_ONE';
  if (posCount === 1) return 'ONE_TO_MANY';
  return 'MANY_TO_MANY';
}

/**
 * Cruces por decisión humana. Único punto que cambia el estado de un cruce tras la ejecución;
 * mantiene `match_items.active` y los estados de las transacciones en la misma transacción.
 */
@Injectable()
export class MatchesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createManual(
    companyId: string,
    userId: string,
    reconciliationId: string,
    dto: CreateManualMatchDto,
  ) {
    const posIds = unique(dto.posIds);
    const bankIds = unique(dto.bankIds);
    const id = await this.inTransaction(async (tx) => {
      await this.assertEditable(tx, companyId, reconciliationId);
      const [pos, bank] = await Promise.all([
        tx.posTransaction.findMany({ where: { id: { in: posIds }, reconciliationId } }),
        tx.bankMovement.findMany({ where: { id: { in: bankIds }, reconciliationId } }),
      ]);
      if (pos.length !== posIds.length || bank.length !== bankIds.length) {
        throw new NotFoundException('Alguna transacción no existe en esta conciliación');
      }
      const busy = [
        ...pos
          .filter((t) => t.status !== 'PENDING')
          .map((t) => `venta POS de la fila ${t.rowNumber}`),
        ...bank
          .filter((t) => t.status !== 'PENDING')
          .map((t) => `movimiento bancario de la fila ${t.rowNumber}`),
      ];
      if (busy.length > 0) {
        throw new ConflictException(`Ya no están pendientes: ${busy.join(', ')}`);
      }
      // Reserva atómica: si otra petición ganó la carrera, el recuento no coincide
      const [claimedPos, claimedBank] = await Promise.all([
        tx.posTransaction.updateMany({
          where: { id: { in: posIds }, status: 'PENDING' },
          data: { status: 'MATCHED' },
        }),
        tx.bankMovement.updateMany({
          where: { id: { in: bankIds }, status: 'PENDING' },
          data: { status: 'MATCHED' },
        }),
      ]);
      if (claimedPos.count !== posIds.length || claimedBank.count !== bankIds.length) {
        throw new ConflictException('Alguna transacción fue cruzada por otro usuario');
      }

      const posTotal = pos.reduce((a, t) => a.plus(t.amount.toString()), new Decimal(0));
      const bankTotal = bank.reduce((a, t) => a.plus(t.amount.toString()), new Decimal(0));
      const match = await tx.match.create({
        data: {
          reconciliationId,
          method: 'MANUAL',
          cardinality: cardinalityOf(pos.length, bank.length),
          status: 'CONFIRMED',
          confidence: 1,
          posTotal: posTotal.toFixed(2),
          bankTotal: bankTotal.toFixed(2),
          difference: bankTotal.minus(posTotal).toFixed(2),
          explanation: dto.note?.trim() || null,
          createdById: userId,
          confirmedById: userId,
          confirmedAt: new Date(),
          items: {
            create: [
              ...posIds.map((posTransactionId) => ({ posTransactionId })),
              ...bankIds.map((bankMovementId) => ({ bankMovementId })),
            ],
          },
        },
      });
      await this.audit.record(tx, {
        companyId,
        userId,
        action: 'CREATE_MANUAL_MATCH',
        entityType: 'match',
        entityId: match.id,
        details: { reconciliationId, posCount: pos.length, bankCount: bank.length },
      });
      await recomputeStats(tx, reconciliationId);
      return match.id;
    });
    return this.detail(id);
  }

  /** Confirma o rechaza un cruce PROPOSED. */
  async decide(companyId: string, userId: string, matchId: string, dto: DecideMatchDto) {
    await this.inTransaction(async (tx) => {
      const match = await this.loadOwned(tx, companyId, matchId);
      await this.assertEditable(tx, companyId, match.reconciliationId);
      if (match.status !== 'PROPOSED') {
        throw new ConflictException('Solo se pueden confirmar o rechazar cruces propuestos');
      }
      const { posIds, bankIds } = this.idsOf(match.items);

      if (dto.action === 'CONFIRM') {
        const reconciliation = await tx.reconciliation.findUniqueOrThrow({
          where: { id: match.reconciliationId },
        });
        const config = withConfigDefaults(reconciliation.config as Partial<ReconciliationConfig>);
        const note = dto.note?.trim();
        if (match.difference.abs().greaterThan(config.amountTolerance) && !note) {
          throw new BadRequestException(
            'La diferencia supera la tolerancia: indica una nota para confirmar el cruce',
          );
        }
        await tx.match.update({
          where: { id: matchId },
          data: {
            status: 'CONFIRMED',
            confirmedById: userId,
            confirmedAt: new Date(),
            ...(note
              ? { explanation: [match.explanation, `Nota: ${note}`].filter(Boolean).join('. ') }
              : {}),
          },
        });
        await this.setTxStatus(tx, posIds, bankIds, 'MATCHED');
      } else {
        await tx.match.update({ where: { id: matchId }, data: { status: 'REJECTED' } });
        await tx.matchItem.updateMany({ where: { matchId }, data: { active: false } });
        await this.setTxStatus(tx, posIds, bankIds, 'PENDING');
      }
      await this.audit.record(tx, {
        companyId,
        userId,
        action: dto.action === 'CONFIRM' ? 'CONFIRM_MATCH' : 'REJECT_MATCH',
        entityType: 'match',
        entityId: matchId,
      });
      await recomputeStats(tx, match.reconciliationId);
    });
    return this.detail(matchId);
  }

  /** Deshace un cruce activo: se elimina y sus transacciones vuelven a PENDING. */
  async undo(companyId: string, userId: string, matchId: string): Promise<void> {
    await this.inTransaction(async (tx) => {
      const match = await this.loadOwned(tx, companyId, matchId);
      await this.assertEditable(tx, companyId, match.reconciliationId);
      if (match.status === 'REJECTED') {
        throw new ConflictException('El cruce ya fue rechazado');
      }
      const { posIds, bankIds } = this.idsOf(match.items);
      await tx.match.delete({ where: { id: matchId } });
      await this.setTxStatus(tx, posIds, bankIds, 'PENDING');
      await this.audit.record(tx, {
        companyId,
        userId,
        action: 'UNDO_MATCH',
        entityType: 'match',
        entityId: matchId,
        details: {
          reconciliationId: match.reconciliationId,
          method: match.method,
          status: match.status,
          posTotal: match.posTotal.toFixed(2),
          bankTotal: match.bankTotal.toFixed(2),
        },
      });
      await recomputeStats(tx, match.reconciliationId);
    });
  }

  private async detail(matchId: string) {
    const row = await this.prisma.match.findUniqueOrThrow({
      where: { id: matchId },
      include: matchInclude,
    });
    return matchView(row);
  }

  private async inTransaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(work, { timeout: 30_000 });
    } catch (error) {
      // El índice único parcial es la última defensa frente a peticiones simultáneas
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Alguna transacción fue cruzada por otro usuario');
      }
      throw error;
    }
  }

  private async assertEditable(tx: Tx, companyId: string, reconciliationId: string) {
    const reconciliation = await tx.reconciliation.findFirst({
      where: { id: reconciliationId, companyId },
      select: { status: true },
    });
    if (!reconciliation) throw new NotFoundException('Conciliación no encontrada');
    if (reconciliation.status === 'CLOSED') {
      throw new BadRequestException('La conciliación está cerrada y no admite cambios');
    }
    if (reconciliation.status === 'PROCESSING') {
      throw new ConflictException('La conciliación se está procesando; espera a que termine');
    }
  }

  private async loadOwned(tx: Tx, companyId: string, matchId: string) {
    const match = await tx.match.findFirst({
      where: { id: matchId, reconciliation: { companyId } },
      include: { items: true },
    });
    if (!match) throw new NotFoundException('Cruce no encontrado');
    return match;
  }

  private idsOf(items: { posTransactionId: string | null; bankMovementId: string | null }[]) {
    return {
      posIds: items.flatMap((i) => (i.posTransactionId ? [i.posTransactionId] : [])),
      bankIds: items.flatMap((i) => (i.bankMovementId ? [i.bankMovementId] : [])),
    };
  }

  private async setTxStatus(
    tx: Tx,
    posIds: string[],
    bankIds: string[],
    status: 'MATCHED' | 'PENDING',
  ) {
    await tx.posTransaction.updateMany({ where: { id: { in: posIds } }, data: { status } });
    await tx.bankMovement.updateMany({ where: { id: { in: bankIds } }, data: { status } });
  }
}
