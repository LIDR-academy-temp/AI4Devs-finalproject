/**
 * In-memory doubles of the settlement read ports (../ports.ts) over an engine input already built from the synthetic
 * world (test-support/sample-input.ts): the source answers from it the way the Prisma adapter answers from the base.
 */
import type { ImportStatus } from '@recon/shared'
import type { Scope } from '../../../catalog/domain/scope.js'
import type { SettlementInput } from '../../domain/types.js'
import type { CurrentRun, ImportContext, PrefilledBatchFees, SettlementSource } from '../ports.js'

export interface InMemorySourceOptions {
  status?: ImportStatus
  merchantId?: number
  blocked?: CurrentRun['blocked']
}

export class InMemorySettlementSource implements SettlementSource {
  calls: string[] = []

  constructor(
    private readonly input: SettlementInput,
    private readonly options: InMemorySourceOptions = {},
  ) {}

  async importContext(scope: Scope, importId: string): Promise<ImportContext | null> {
    this.calls.push('importContext')
    if (importId !== this.input.importId || !scope.merchantIds.includes(this.options.merchantId ?? 1)) return null
    return { importId, status: this.options.status ?? 'validated', account: this.input.account }
  }

  async currentRun(importId: string): Promise<CurrentRun | null> {
    this.calls.push('currentRun')
    if (importId !== this.input.importId) return null
    return { runId: this.input.runId, ranges: this.input.ranges, blocked: this.options.blocked ?? null }
  }

  async rows(importId: string) {
    this.calls.push('rows')
    return importId === this.input.importId ? [...this.input.rows] : []
  }

  async inclusions(runId: number) {
    this.calls.push('inclusions')
    return runId === this.input.runId ? [...this.input.inclusions] : []
  }

  async channels(_accountId: string, channelIds: readonly number[]) {
    this.calls.push('channels')
    return this.input.channels.filter((c) => channelIds.includes(c.channelId))
  }

  async previousE(_providerId: number, transactionIds: readonly bigint[], _excludeImportId: string) {
    this.calls.push('previousE')
    return new Set(transactionIds.filter((id) => this.input.previousE.has(id)))
  }

  async accountFees() {
    this.calls.push('accountFees')
    return [...this.input.fees]
  }

  async feeTypes() {
    this.calls.push('feeTypes')
    return [...this.input.feeTypes]
  }

  async attempts() {
    this.calls.push('attempts')
    return [...this.input.attempts]
  }
}

export class InMemoryPrefilledBatchFees implements PrefilledBatchFees {
  constructor(private readonly feeTypeIds: ReadonlySet<number>) {}

  async feeTypeIdsOf(): Promise<Set<number>> {
    return new Set(this.feeTypeIds)
  }
}
