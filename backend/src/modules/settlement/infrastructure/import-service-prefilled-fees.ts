// The pre-filled batch fees as GET /imports/{id} proposes them (re-read from the Other Fees sheet by the import
// service), so the source = file exception (design D13, P7) admits exactly what the analyst was shown.
import type { Scope } from '../../catalog/domain/scope.js'
import type { ImportService } from '../../imports/application/import-service.js'
import type { PrefilledBatchFees } from '../application/ports.js'

export class ImportServicePrefilledFees implements PrefilledBatchFees {
  constructor(private readonly imports: Pick<ImportService, 'getImport'>) {}

  async feeTypeIdsOf(scope: Scope, importId: string): Promise<Set<number>> {
    const detail = await this.imports.getImport(scope, importId)
    return new Set((detail.batchFees ?? []).flatMap((f) => (f.feeTypeId === null ? [] : [f.feeTypeId])))
  }
}
