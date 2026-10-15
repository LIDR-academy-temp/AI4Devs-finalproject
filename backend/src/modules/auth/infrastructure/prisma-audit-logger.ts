import type { PrismaClient } from '../../../generated/prisma/client.js'
import type { AuditEntry, AuditLogger } from '../application/ports.js'

export class PrismaAuditLogger implements AuditLogger {
  constructor(private readonly prisma: PrismaClient) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        // AuditLog.entityId is VARCHAR(64)
        entityId: entry.entityId.slice(0, 64),
        detailJson: JSON.stringify(entry.detail),
      },
    })
  }
}
