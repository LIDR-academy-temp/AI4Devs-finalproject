import { ValidationIssueDetail, ValidationIssuesPage, ValidationIssuesQuery } from '@recon/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError } from '../../../shared/errors.js'
import type { Scope } from '../../catalog/domain/scope.js'
import { sampleInput } from '../test-support/sample-input.js'
import { InMemoryRunRepository } from './__fakes__/in-memory-runs.js'
import { ValidationService } from './validation-service.js'

// List and detail of findings (validation-runs design D8, D9 editable/includable/resolvable) over the doubles: the real
// analysis of batch-issues and the in-memory run repository.
const ANALYST: Scope = { merchantIds: [1, 2] }
const VIEWER: Scope = { merchantIds: [1] }
const ANALYST_ID = 2
const NOW = new Date('2026-10-18T10:15:30.123Z')

let runs: InMemoryRunRepository
let service: ValidationService
let importId: string

beforeEach(async () => {
  const issues = await sampleInput('batch-issues')
  runs = new InMemoryRunRepository()
  importId = issues.importId
  runs.addImport({ importId, merchantId: 1, status: 'analyzed' })
  runs.describeImport(issues.imports.stored(importId))
  service = new ValidationService({ sources: issues.sources, runs, log: { info: vi.fn() }, now: () => NOW })
})

const query = (q: Record<string, string> = {}) => ValidationIssuesQuery.parse(q)
const list = (q: Record<string, string> = {}) => service.listIssues(VIEWER, importId, query(q))

async function issueOf(q: Record<string, string>, transactionIdRaw?: string) {
  const page = await list({ ...q, pageSize: '500' })
  const found = page.items.find((i) => transactionIdRaw === undefined || i.transactionIdRaw === transactionIdRaw)
  if (!found) throw new Error(`no finding for ${JSON.stringify(q)} ${transactionIdRaw ?? ''}`)
  return found
}

describe('listIssues', () => {
  beforeEach(async () => {
    await service.run(ANALYST, ANALYST_ID, importId)
  })

  it('filters the duplicate in the batch: one finding with 2 occurrences, 1 included by default', async () => {
    const page = await list({ type: 'duplicate', scope: 'in_batch' })

    expect(ValidationIssuesPage.safeParse(page).success).toBe(true)
    expect(page.total).toBe(1)
    expect(page.items[0]).toMatchObject({
      transactionIdRaw: '441706751475644',
      validationCode: 'duplicate_in_batch',
      occurrenceCount: 2,
      includedByDefaultCount: 1,
      includedCount: 1,
      resolutionStatus: 'persistent',
    })
  })

  it('the 16 persistent missing findings in the fixed order: validation, range, relevantDate', async () => {
    const page = await list({ type: 'missing', status: 'persistent', pageSize: '50' })

    expect(page.total).toBe(16)
    expect(page.items.map((i) => i.missingRange)).toEqual([
      ...Array(10).fill('DEC'),
      ...Array(3).fill('APP'),
      ...Array(3).fill('R'),
    ])
    for (const range of ['DEC', 'APP', 'R']) {
      const dates = page.items.filter((i) => i.missingRange === range).map((i) => i.relevantDate as string)
      expect(dates).toEqual([...dates].sort())
    }
  })

  it('the order does not depend on the ids: the same order with the ids assigned in reverse', async () => {
    const before = (await list({ pageSize: '500' })).items.map((i) => [
      i.validationCode,
      i.transactionIdRaw,
      i.missingRange,
    ])
    runs.reverseIssueIds()

    const after = (await list({ pageSize: '500' })).items.map((i) => [
      i.validationCode,
      i.transactionIdRaw,
      i.missingRange,
    ])

    expect(after).toEqual(before)
  })

  it('validationCode and cycle filters, and pagination over the total order', async () => {
    const all = (await list({ pageSize: '500' })).items
    const second = await list({ page: '2', pageSize: '5' })

    expect(all).toHaveLength(23)
    expect(second.total).toBe(23)
    expect(second.items.map((i) => i.issueId)).toEqual(all.slice(5, 10).map((i) => i.issueId))
    expect((await list({ validationCode: 'missing_in_range' })).total).toBe(6)
    const reserves = (await list({ cycle: 'R' })).items
    expect(reserves).toHaveLength(3)
    expect(reserves.every((i) => i.cycle === 'R')).toBe(true)
  })

  it('a one-row finding brings its gateway status and source row', async () => {
    const nra = await issueOf({ type: 'non_recorded_adjustment' }, '281520820250015')

    expect(nra.gatewayStatus).toMatchObject({ code: 'Successful' })
    expect(nra.source).toMatchObject({ sheetName: expect.any(String), rowNo: expect.any(Number) })
    expect(nra.occurrenceCount).toBe(0)
  })
})

describe('listIssues without a run', () => {
  it('is empty', async () => {
    expect(await list()).toEqual({ items: [], page: 1, pageSize: 50, total: 0 })
  })
})

describe('getIssue', () => {
  beforeEach(async () => {
    await service.run(ANALYST, ANALYST_ID, importId)
  })

  it('the in-batch collision of 911545593909470: two current occurrences in APP and DEC, both included, empty history', async () => {
    const { issueId } = await issueOf({ type: 'collision', scope: 'in_batch' }, '911545593909470')

    const detail = await service.getIssue(VIEWER, false, issueId)

    expect(ValidationIssueDetail.safeParse(detail).success).toBe(true)
    expect(detail).toMatchObject({ importId, importStatus: 'analyzed', run: { isCurrent: true }, resolvable: false })
    expect(detail.occurrences.map((o) => [o.sourceType, o.location?.sheetName, o.status?.code])).toEqual([
      ['current_import', 'APP', 'Successful'],
      ['current_import', 'DEC', 'Declined'],
    ])
    expect(detail.occurrences.every((o) => o.defaultIncluded && o.includeInSettlement && o.changedBy === null)).toBe(
      true,
    )
    expect(detail.history).toEqual([])
  })

  it('editable and includable for whoever may process, never for a historical occurrence or a viewer', async () => {
    const { issueId } = await issueOf({ type: 'duplicate', scope: 'across_batches' }, '504712738863260')

    const asAnalyst = await service.getIssue(ANALYST, true, issueId)
    const asViewer = await service.getIssue(VIEWER, false, issueId)

    expect(asAnalyst.occurrences.map((o) => [o.sourceType, o.editable, o.includable])).toEqual([
      ['current_import', true, true],
      ['previous_batch', false, false],
    ])
    expect(asAnalyst.occurrences[1]!.batch).toMatchObject({ batchNo: 51, attemptNo: 1, accountName: 'ProviderB-Main' })
    expect(asViewer.occurrences.every((o) => !o.editable && !o.includable)).toBe(true)
  })

  it('resolvable: a persistent non_recorded_adjustment of the current run, for whoever may process', async () => {
    const { issueId } = await issueOf({ type: 'non_recorded_adjustment' })

    expect((await service.getIssue(ANALYST, true, issueId)).resolvable).toBe(true)
    expect((await service.getIssue(ANALYST, false, issueId)).resolvable).toBe(false)
  })

  it('in cancelled nothing is editable, and a finding of a superseded run reads with isCurrent = false', async () => {
    const { issueId } = await issueOf({ type: 'collision', scope: 'in_batch' })
    runs.setStatus(importId, 'cancelled')
    expect((await service.getIssue(ANALYST, true, issueId)).occurrences.some((o) => o.editable)).toBe(false)

    runs.setStatus(importId, 'analyzed')
    await service.run(ANALYST, ANALYST_ID, importId)
    const old = await service.getIssue(ANALYST, true, issueId)

    expect(old.run.isCurrent).toBe(false)
    expect(old.occurrences.some((o) => o.editable)).toBe(false)
  })

  it('the history of inclusion changes and the resolution comes from the audit, oldest first', async () => {
    const { issueId } = await issueOf({ type: 'duplicate', scope: 'in_batch' })
    const detail = await service.getIssue(ANALYST, true, issueId)
    const excluded = detail.occurrences.find((o) => !o.defaultIncluded)!
    runs.recordInclusionChange(excluded.occurrenceId, ANALYST_ID, true, new Date('2026-10-18T10:21:00.000Z'))
    runs.recordInclusionChange(excluded.occurrenceId, ANALYST_ID, false, new Date('2026-10-18T10:20:00.000Z'))

    const history = (await service.getIssue(ANALYST, true, issueId)).history

    expect(history.map((h) => [h.at, h.action, h.from, h.to, h.user.userName])).toEqual([
      ['2026-10-18T10:20:00.000Z', 'set_inclusion', true, false, 'analyst'],
      ['2026-10-18T10:21:00.000Z', 'set_inclusion', false, true, 'analyst'],
    ])
  })

  it('404 identical for an unknown finding and for one outside the scope', async () => {
    const { issueId } = await issueOf({ type: 'collision', scope: 'in_batch' })
    runs.setMerchant(importId, 2)

    const foreign = await service.getIssue(VIEWER, false, issueId).catch((e: unknown) => e)
    const unknown = await service.getIssue(VIEWER, false, 999_999).catch((e: unknown) => e)

    expect(foreign).toBeInstanceOf(NotFoundError)
    expect(unknown).toBeInstanceOf(NotFoundError)
    expect((foreign as Error).message).toBe((unknown as Error).message)
  })
})
