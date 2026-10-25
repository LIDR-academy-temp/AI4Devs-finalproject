import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';

export interface AuditEntry {
  companyId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Prisma.InputJsonValue;
}

/** Gancho de auditoría: `exception-management-and-audit` lo amplía con consulta y más acciones. */
@Injectable()
export class AuditService {
  record(tx: Prisma.TransactionClient, entry: AuditEntry): Promise<unknown> {
    return tx.auditLog.create({ data: entry });
  }
}
