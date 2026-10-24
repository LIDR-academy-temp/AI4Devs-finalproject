import { BadRequestException } from '@nestjs/common';
import type { ReconciliationStatus } from '../generated/prisma/client.js';

/** Tabla de transiciones permitidas (spec reconciliations, "Ciclo de vida de estados"). */
export const ALLOWED_TRANSITIONS: Record<ReconciliationStatus, readonly ReconciliationStatus[]> = {
  DRAFT: ['PROCESSING'],
  PROCESSING: ['COMPLETED', 'FAILED'],
  FAILED: ['PROCESSING'],
  COMPLETED: ['PROCESSING', 'CLOSED'],
  CLOSED: [],
};

export function canTransition(from: ReconciliationStatus, to: ReconciliationStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Única vía para validar un cambio de estado; lanza 400 si la transición no está permitida. */
export function assertTransition(from: ReconciliationStatus, to: ReconciliationStatus): void {
  if (!canTransition(from, to)) {
    throw new BadRequestException(`Transición de estado no permitida: ${from} → ${to}`);
  }
}
