import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  withConfigDefaults,
  type ReconciliationConfig,
} from '../reconciliations/reconciliation-config.js';
import { assertTransition } from '../reconciliations/reconciliation-state.js';
import type { RunReconciliationDto } from './run.dto.js';
import { ReconciliationRunner } from './reconciliation-runner.js';

@Injectable()
export class MatchingService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ReconciliationRunner) private readonly runner: ReconciliationRunner,
  ) {}

  /**
   * Valida las precondiciones, pasa a PROCESSING con el candado de estado y lanza el motor fuera
   * de la petición. Devuelve de inmediato (la API responde 202).
   */
  async start(
    companyId: string,
    userId: string,
    id: string,
    dto: RunReconciliationDto,
  ): Promise<{ id: string; status: 'PROCESSING' }> {
    const reconciliation = await this.prisma.reconciliation.findFirst({ where: { id, companyId } });
    if (!reconciliation) throw new NotFoundException('Conciliación no encontrada');
    if (reconciliation.status === 'PROCESSING') {
      throw new ConflictException('Ya hay una ejecución en curso para esta conciliación');
    }
    if (reconciliation.status === 'CLOSED') {
      throw new BadRequestException('La conciliación está cerrada y no se puede ejecutar');
    }
    assertTransition(reconciliation.status, 'PROCESSING');

    const imported = await this.prisma.importedFile.groupBy({
      by: ['sourceType'],
      where: { reconciliationId: id, status: 'IMPORTED' },
    });
    const missing = (['POS', 'BANK'] as const).filter(
      (s) => !imported.some((f) => f.sourceType === s),
    );
    if (missing.length > 0) {
      const names = missing.map((s) => (s === 'POS' ? 'POS' : 'extracto bancario'));
      throw new UnprocessableEntityException(`Falta importar: ${names.join(' y ')}`);
    }

    const overrides = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    ) as Partial<ReconciliationConfig>;
    const config = withConfigDefaults({
      ...(reconciliation.config as Partial<ReconciliationConfig>),
      ...overrides,
    });

    // Candado: solo una petición logra pasar de un estado ejecutable a PROCESSING
    const locked = await this.prisma.reconciliation.updateMany({
      where: { id, companyId, status: { in: ['DRAFT', 'COMPLETED', 'FAILED'] } },
      data: { status: 'PROCESSING', config: config as unknown as Prisma.InputJsonValue },
    });
    if (locked.count === 0) {
      throw new ConflictException('Ya hay una ejecución en curso para esta conciliación');
    }

    setImmediate(() => void this.runner.run(id, companyId, userId));
    return { id, status: 'PROCESSING' };
  }
}
