// Test double of the shared audit port: keeps every entry; `failWith` simulates a failing audit write.
import type { AuditEntry, AuditLogger } from '../shared/audit.js'

export class InMemoryAuditLogger implements AuditLogger {
  entries: AuditEntry[] = []
  failWith: Error | null = null

  async record(entry: AuditEntry): Promise<void> {
    if (this.failWith) throw this.failWith
    this.entries.push(structuredClone(entry))
  }
}
