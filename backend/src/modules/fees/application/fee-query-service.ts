// Reads of the fee administration (README §4.4; spec fees "Vista global de fees", "Filtros de la vista global",
// "Historial de un fee por API"; admin-fees design D8, D10).
import type { FeeHistoryEntry, FeeHistoryQuery, FeePage, FeesQuery } from '@recon/shared'
import { NotFoundError } from '../../../shared/errors.js'
import type { Scope } from '../../catalog/domain/scope.js'
import { statusOf } from '../domain/fee-validity.js'
import { newYorkToday, type Today } from './fee-read-service.js'
import type { FeeQueryRepository } from './ports.js'

export class FeeQueryService {
  constructor(
    private readonly repository: FeeQueryRepository,
    private readonly today: Today = newYorkToday,
  ) {}

  /** A page of the fees in scope; a merchant, provider or account filter outside the scope is a 404. */
  async list(scope: Scope, query: FeesQuery): Promise<FeePage> {
    const missing = await this.repository.missingFilter(scope, query)
    if (missing !== null) throw new NotFoundError(missing)
    const today = this.today()
    const { items, total } = await this.repository.list(scope, query, today)
    return {
      items: items.map((item) => ({ ...item, status: statusOf(item, today) })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    }
  }

  async history(scope: Scope, feeId: string, query: FeeHistoryQuery): Promise<FeeHistoryEntry[]> {
    const rows = await this.repository.history(scope, feeId, query.scope)
    if (rows === null) throw new NotFoundError('Fee')
    return rows
  }
}
