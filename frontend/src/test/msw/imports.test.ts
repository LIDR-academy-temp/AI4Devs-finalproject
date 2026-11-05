// The fake import API on its own, without screens (design D12): state machine, fingerprint, error codes and scope.
import { ImportRowItem } from '@recon/shared'
import { describe, expect, it } from 'vitest'
import type { ImportDetail, ImportListPage, ImportRowsPage } from '@/lib/api/types'
import { ACCOUNT_IDS, type UserName } from './fixtures'
import { issueTokens } from './handlers'
import { holdNext, importRecord, importRequests, sampleFile, seedAmbiguousRow, seedImport } from './imports'

const MiB20 = 20 * 1024 * 1024
const REASON = { reason: 'Wrong file from the provider' }

async function call(as: UserName, method: string, path: string, body?: FormData | object) {
  const { accessToken } = issueTokens(as)
  const headers: Record<string, string> = { authorization: `Bearer ${accessToken}` }
  let payload: BodyInit | undefined
  if (body instanceof FormData) payload = body
  else if (body !== undefined) {
    headers['content-type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const response = await fetch(`${window.location.origin}/api/v1${path}`, { method, headers, body: payload })
  return { status: response.status, body: await response.json() }
}

const form = (...files: File[]) => {
  const data = new FormData()
  for (const file of files) data.append('files', file)
  return data
}

const createIn = (account: keyof typeof ACCOUNT_IDS, as: UserName, ...files: File[]) =>
  call(as, 'POST', `/accounts/${ACCOUNT_IDS[account]}/imports`, form(...files))

/** The proposal as it stands, as a mapping confirmation body. */
function proposalOf(detail: ImportDetail) {
  return {
    sheets: detail.files
      .flatMap((f) => f.sheets)
      .map((s) => ({
        sheetId: s.sheetId,
        kind: s.proposed.kind,
        cycle: s.proposed.kind === 'transactions' ? s.proposed.cycle : null,
        statusId: s.proposed.kind === 'transactions' ? s.proposed.statusId : null,
        columns:
          s.proposed.kind === 'ignore'
            ? []
            : s.columns.flatMap((c) =>
                c.targetField ? [{ sourceColumn: c.sourceColumn, targetField: c.targetField }] : [],
              ),
      })),
  }
}

describe('fake import API', () => {
  it('walks batch-clean through upload, duplicate, mapping, analysis, rows and cancel', async () => {
    const created = await createIn('ProviderA-USD', 'analyst', sampleFile('batch-clean'))
    expect(created.status).toBe(201)
    const detail = created.body as ImportDetail
    expect(detail.status).toBe('uploaded')
    expect(detail.createdBy.userName).toBe('analyst')
    expect(detail.files).toHaveLength(1)
    expect(detail.files[0]!.sheets.map((s) => [s.sheetName, s.rowCount])).toEqual([
      ['APP', 340],
      ['DEC', 110],
      ['CHB', 3],
      ['REF', 7],
      ['RDR', 3],
      ['RR', 320],
      ['Duplicate Corrections', 0],
      ['CHB Alerts', 0],
      ['Other Fees', 2],
      ['Settings', 21],
    ])
    const id = detail.importId

    const duplicate = await call(
      'analyst',
      'POST',
      `/imports/${id}/files`,
      form(sampleFile('batch-clean', 'copy.xlsx')),
    )
    expect(duplicate.status).toBe(409)
    expect(duplicate.body).toMatchObject({
      code: 'duplicate_file',
      details: { fileId: detail.files[0]!.fileId, fileName: 'Recon_Template_ProviderA-USD_batch-clean.xlsx' },
    })

    const mapped = await call('analyst', 'PUT', `/imports/${id}/mapping`, proposalOf(detail))
    expect(mapped.status).toBe(200)
    expect(mapped.body.status).toBe('mapped')

    const analyzed = await call('analyst', 'POST', `/imports/${id}/analyze`)
    expect(analyzed.status).toBe(200)
    expect(analyzed.body.status).toBe('analyzed')
    expect(analyzed.body.analysis.rows).toEqual({
      total: 783,
      matched: 780,
      unmatched: 0,
      ambiguous: 0,
      ignored: 3,
      unmatchedByReason: { no_match: 0, id_format: 0, lossy_numeric_id: 0, no_gateways: 0 },
    })
    expect(analyzed.body.analysis).toMatchObject({ requiresEmptyBatchConfirmation: false, likelyWrongAccount: false })

    const rows = await call('analyst', 'GET', `/imports/${id}/rows?match=matched&page=16&pageSize=50`)
    const page = rows.body as ImportRowsPage
    expect(page.total).toBe(780)
    expect(page.items).toHaveLength(30)
    expect(page.items.every((r) => r.matchResult === 'matched')).toBe(true)

    const notEditable = await call('analyst', 'PUT', `/imports/${id}/mapping`, proposalOf(detail))
    expect(notEditable.status).toBe(409)
    expect(notEditable.body).toMatchObject({ code: 'import_not_editable', details: { status: 'analyzed' } })

    const cancelled = await call('analyst', 'POST', `/imports/${id}/cancel`, REASON)
    expect(cancelled.status).toBe(200)
    expect(cancelled.body.status).toBe('cancelled')
    const again = await call('analyst', 'POST', `/imports/${id}/cancel`, REASON)
    expect(again.status).toBe(409)
    expect(again.body).toMatchObject({ code: 'import_not_cancellable', details: { status: 'cancelled' } })
  })

  it('answers 403 to viewer on every write and 404 on an import of another merchant', async () => {
    const own = seedImport('batch-clean', { status: 'mapped' })
    const foreign = seedImport('legacy-provider', { account: 'ProviderC-Alt' })

    expect((await createIn('ProviderA-USD', 'viewer', sampleFile('batch-clean'))).status).toBe(403)
    expect(
      (await call('viewer', 'POST', `/imports/${own.importId}/files`, form(sampleFile('batch-issues')))).status,
    ).toBe(403)
    expect((await call('viewer', 'DELETE', `/imports/${own.importId}/files/${own.files[0]!.fileId}`)).status).toBe(403)
    expect((await call('viewer', 'PUT', `/imports/${own.importId}/mapping`, proposalOf(own))).status).toBe(403)
    expect((await call('viewer', 'POST', `/imports/${own.importId}/analyze`)).status).toBe(403)
    expect((await call('viewer', 'POST', `/imports/${own.importId}/cancel`, REASON)).status).toBe(403)
    expect((await call('viewer', 'GET', `/imports/${own.importId}`)).status).toBe(200)

    const hidden = await call('viewer', 'GET', `/imports/${foreign.importId}`)
    expect(hidden.status).toBe(404)
    expect(hidden.body.code).toBe('not_found')
  })

  it('rejects a wrong type, an oversized file, eleven parts and an unreadable workbook', async () => {
    const csv = await createIn('ProviderA-USD', 'analyst', sampleFile('batch-clean', 'batch.csv'))
    expect(csv.status).toBe(400)
    expect(csv.body).toMatchObject({ code: 'unsupported_file_type', details: { fileName: 'batch.csv' } })

    const big = new File([new Uint8Array(MiB20 + 1)], 'big.xlsx')
    const tooLarge = await createIn('ProviderA-USD', 'analyst', big)
    expect(tooLarge.status).toBe(400)
    expect(tooLarge.body).toMatchObject({ code: 'file_too_large', details: { fileName: 'big.xlsx' } })

    const eleven = Array.from({ length: 11 }, (_, i) => sampleFile(`generic-${i + 1}`))
    const tooMany = await createIn('ProviderA-USD', 'analyst', ...eleven)
    expect(tooMany.status).toBe(400)
    expect(tooMany.body.code).toBe('too_many_files')

    const broken = await createIn('ProviderA-USD', 'analyst', sampleFile('broken'))
    expect(broken.status).toBe(422)
    expect(broken.body).toMatchObject({ code: 'file_unreadable', details: { fileName: 'broken.xlsx' } })
  })

  it('accepts a file of exactly 20 MiB', async () => {
    const created = await createIn('ProviderA-USD', 'analyst', sampleFile('batch-clean', 'exact.xlsx', MiB20))
    expect(created.status).toBe(201)
    expect(created.body.files[0].sizeBytes).toBe(MiB20)
  })

  it('holds a response until the test releases it', async () => {
    const detail = seedImport('batch-clean', { status: 'mapped' })
    const hold = holdNext('analyze')
    let settled = false
    const pending = call('analyst', 'POST', `/imports/${detail.importId}/analyze`).then((r) => {
      settled = true
      return r
    })

    await hold.arrived
    expect(settled).toBe(false)
    hold.release()
    expect((await pending).status).toBe(200)
  })
})

describe('fake import API: GET /imports (spec "Imports en curso", "Filtros" and "Paginación de imports en curso")', () => {
  const list = async (as: UserName, query = '') => {
    const res = await call(as, 'GET', `/imports${query}`)
    return { status: res.status, body: res.body as ImportListPage & { code?: string } }
  }

  it('lists the open imports of the scope, latest update first, each with its hierarchy', async () => {
    const usd = seedImport('batch-split', { labels: ['batch-split_part1'] })
    const cancelled = seedImport('batch-split', { labels: ['batch-split_part1'], status: 'cancelled' })
    const legacy = seedImport('legacy-provider', { status: 'mapped' })

    const { status, body } = await list('analyst')

    expect(status).toBe(200)
    expect(body).toMatchObject({ page: 1, pageSize: 50, total: 2 })
    expect(body.items.map((i) => i.importId)).toEqual([legacy.importId, usd.importId])
    expect(body.items.map((i) => i.importId)).not.toContain(cancelled.importId)
    expect(body.items[0]).toMatchObject({
      status: 'mapped',
      fileCount: 1,
      account: { id: ACCOUNT_IDS['ProviderC-Alt'], name: 'ProviderC-Alt' },
      provider: { id: 201, name: 'Provider C' },
      merchant: { id: 2, name: 'Merchant B' },
    })
    expect((await list('viewer')).body.items.map((i) => i.importId)).toEqual([usd.importId])
  })

  it('filters by status, merchant, provider, account and mine', async () => {
    const usd = seedImport('batch-split', { labels: ['batch-split_part1'] })
    const legacy = seedImport('legacy-provider', { status: 'mapped' })
    const admins = seedImport('batch-split', { labels: ['batch-split_part1'], createdBy: 'admin' })
    const cancelled = seedImport('batch-split', { labels: ['batch-split_part1'], status: 'cancelled' })
    const ids = async (query: string) => (await list('analyst', query)).body.items.map((i) => i.importId)

    expect(await ids('?status=cancelled')).toEqual([cancelled.importId])
    expect(await ids('?status=mapped')).toEqual([legacy.importId])
    expect(await ids('?merchantId=2')).toEqual([legacy.importId])
    expect(await ids('?providerId=101')).toEqual([admins.importId, usd.importId])
    expect(await ids(`?accountId=${ACCOUNT_IDS['ProviderC-Alt']}`)).toEqual([legacy.importId])
    expect(await ids('?mine=true')).toEqual([legacy.importId, usd.importId])
  })

  it('pages with the total of every match', async () => {
    const created = [1, 2, 3].map(() => seedImport('batch-split', { labels: ['batch-split_part1'] }).importId)

    const first = await list('analyst', '?pageSize=2')
    const second = await list('analyst', '?pageSize=2&page=2')

    expect(first.body).toMatchObject({ page: 1, pageSize: 2, total: 3 })
    expect([...first.body.items, ...second.body.items].map((i) => i.importId).sort()).toEqual(created.sort())
  })

  it('answers 400 for values outside the contract and 404 for a filter outside the scope', async () => {
    for (const query of ['?status=weird', '?mine=yes', '?merchantId=abc', '?accountId=123', '?pageSize=501']) {
      const res = await list('analyst', query)
      expect(res.status, query).toBe(400)
      expect(res.body.code).toBe('validation_error')
    }
    for (const query of ['?merchantId=2', '?providerId=201', `?accountId=${ACCOUNT_IDS['ProviderC-Alt']}`]) {
      const res = await list('viewer', query)
      expect(res.status, query).toBe(404)
      expect(res.body.code).toBe('not_found')
    }
    expect((await list('analyst', '?merchantId=999')).status).toBe(404)
  })
})

describe('fake import API: the reason of a cancel (spec "Motivo de la cancelación")', () => {
  it('answers 400 validation_error without a valid reason, and logs every body as it was sent (review-diff M2)', async () => {
    const detail = seedImport('batch-split', { labels: ['batch-split_part1'] })

    for (const body of [undefined, {}, { reason: '   ' }, { reason: 'x'.repeat(501) }, { reason: 'x', note: 'y' }]) {
      const res = await call('analyst', 'POST', `/imports/${detail.importId}/cancel`, body)
      expect(res.status, JSON.stringify(body)).toBe(400)
      expect(res.body.code).toBe('validation_error')
    }
    expect(importRecord(detail.importId).status).toBe('uploaded')
    // The raw body, before any validation: a test of the screen sees exactly what the screen sent.
    expect(importRequests('cancel').map((r) => r.body)).toEqual([
      undefined,
      {},
      { reason: '   ' },
      { reason: 'x'.repeat(501) },
      { reason: 'x', note: 'y' },
    ])

    const res = await call('analyst', 'POST', `/imports/${detail.importId}/cancel`, { reason: '  Duplicate upload ' })
    expect(res.status).toBe(200)
    expect(importRequests('cancel').at(-1)?.body).toEqual({ reason: '  Duplicate upload ' })
  })
})

describe('fake import API: PATCH rows (spec "Resolución de una fila ambigua"; web-ambiguous-rows D5)', () => {
  const resolve = (as: UserName, importId: string, sheetId: string, rowNo: number | string, body: object) =>
    call(as, 'PATCH', `/imports/${importId}/rows/${sheetId}/${rowNo}`, body)

  it('answers 200 with the row the API resolves, in the contract, and GET rows shows it matched', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const row = seedAmbiguousRow(importId)

    const res = await resolve('analyst', importId, row.sheetId, row.rowNo, { gatewayId: 1 })

    expect(res.status).toBe(200)
    expect(ImportRowItem.parse(res.body)).toMatchObject({
      matchResult: 'matched',
      gatewayId: 1,
      transactionId: '9001',
      transaction: { channelName: 'RAM-01' },
      candidates: row.candidates,
    })
    expect(importRequests('resolveRow').at(-1)?.body).toEqual({ gatewayId: 1 })
    const page = (await call('analyst', 'GET', `/imports/${importId}/rows?match=matched&page=1&pageSize=500`))
      .body as ImportRowsPage
    expect(page.items.find((r) => r.rowNo === row.rowNo)).toMatchObject({ matchResult: 'matched', gatewayId: 1 })
    expect((await call('analyst', 'GET', `/imports/${importId}`)).body.analysis.rows.ambiguous).toBe(0)
  })

  it('resolves to a candidate of another merchant without its transaction', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const row = seedAmbiguousRow(importId)

    const res = await resolve('analyst', importId, row.sheetId, row.rowNo, { gatewayId: 3 })

    expect(res.status).toBe(200)
    expect(ImportRowItem.parse(res.body)).toMatchObject({
      matchResult: 'matched',
      gatewayId: 3,
      transaction: null,
      warnings: ['out_of_scope_transaction'],
    })
  })

  it('answers 403 to viewer even for an import it cannot see (permission before scope, as the API), 404 for an unknown import and 409 import_not_editable outside analyzed', async () => {
    const own = seedImport('batch-clean', { status: 'analyzed' })
    const row = seedAmbiguousRow(own.importId)
    const foreign = seedImport('legacy-provider', { account: 'ProviderC-Alt', status: 'analyzed' })
    const foreignRow = seedAmbiguousRow(foreign.importId)
    const validated = seedImport('batch-clean', { status: 'validated' })
    const validatedRow = seedAmbiguousRow(validated.importId)

    const forbidden = await resolve('viewer', own.importId, row.sheetId, row.rowNo, { gatewayId: 1 })
    expect(forbidden.status).toBe(403)
    expect(forbidden.body.code).toBe('forbidden')
    const hidden = await resolve('viewer', foreign.importId, foreignRow.sheetId, foreignRow.rowNo, { gatewayId: 1 })
    expect(hidden.status).toBe(403)
    expect(hidden.body.code).toBe('forbidden')
    const unknownImport = await resolve('analyst', '00000000-0000-4000-8000-ffffffffffff', row.sheetId, row.rowNo, {
      gatewayId: 1,
    })
    expect(unknownImport.status).toBe(404)
    expect(unknownImport.body.code).toBe('not_found')
    const notEditable = await resolve('analyst', validated.importId, validatedRow.sheetId, validatedRow.rowNo, {
      gatewayId: 1,
    })
    expect(notEditable.status).toBe(409)
    expect(notEditable.body).toMatchObject({ code: 'import_not_editable', details: { status: 'validated' } })
    expect(importRecord(own.importId).rows!.find((r) => r.rowNo === row.rowNo)?.matchResult).toBe('ambiguous')
  })

  it('answers 400 for a bad rowNo or body, 404 for an unknown row, 409 row_not_ambiguous and 400 with the candidates', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const row = seedAmbiguousRow(importId)
    const matched = importRecord(importId).rows!.find((r) => r.matchResult === 'matched')!

    expect((await resolve('analyst', importId, row.sheetId, 'abc', { gatewayId: 1 })).status).toBe(400)
    const zero = await resolve('analyst', importId, row.sheetId, row.rowNo, { gatewayId: 0 })
    expect(zero.status).toBe(400)
    expect(zero.body.code).toBe('validation_error')
    const unknown = await resolve('analyst', importId, row.sheetId, 99999, { gatewayId: 1 })
    expect(unknown.status).toBe(404)
    expect(unknown.body.code).toBe('not_found')
    const notAmbiguous = await resolve('analyst', importId, matched.sheetId, matched.rowNo, { gatewayId: 1 })
    expect(notAmbiguous.status).toBe(409)
    expect(notAmbiguous.body).toMatchObject({ code: 'row_not_ambiguous', details: { matchResult: 'matched' } })
    const notCandidate = await resolve('analyst', importId, row.sheetId, row.rowNo, { gatewayId: 2 })
    expect(notCandidate.status).toBe(400)
    expect(notCandidate.body).toMatchObject({
      code: 'validation_error',
      details: { gatewayId: 2, candidates: row.candidates },
    })
    expect(importRecord(importId).rows!.find((r) => r.rowNo === row.rowNo)?.matchResult).toBe('ambiguous')
  })

  it('answers the 400 of the schema before the permission, as Fastify validates before the preHandler (#72)', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const row = seedAmbiguousRow(importId)

    const badRowNo = await resolve('viewer', importId, row.sheetId, 'abc', { gatewayId: 1 })
    expect(badRowNo.status).toBe(400)
    expect(badRowNo.body.code).toBe('validation_error')
    const badBody = await resolve('viewer', importId, row.sheetId, row.rowNo, { gatewayId: 0 })
    expect(badBody.status).toBe(400)
    expect(badBody.body.code).toBe('validation_error')
  })

  it('decides with the candidates of the stored row, as the API: one taken out of it is no longer accepted', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const row = seedAmbiguousRow(importId)
    const stored = importRecord(importId).rows!.find((r) => r.rowNo === row.rowNo && r.sheetId === row.sheetId)!
    stored.candidates = stored.candidates.filter((c) => c.gatewayId !== 1)

    const res = await resolve('analyst', importId, row.sheetId, row.rowNo, { gatewayId: 1 })

    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({
      code: 'validation_error',
      details: { gatewayId: 1, candidates: stored.candidates },
    })
    expect(importRecord(importId).rows!.find((r) => r.rowNo === row.rowNo)?.matchResult).toBe('ambiguous')
  })
})

describe('fake import API: sheets not confirmed in the readiness (spec "Hojas sin confirmar en la readiness")', () => {
  it('names each unconfirmed sheet of a mapped import with field confirmation, and only those', async () => {
    const detail = seedImport('batch-split', { labels: ['batch-split_part1'], status: 'mapped' })

    const added = await call(
      'analyst',
      'POST',
      `/imports/${detail.importId}/files`,
      form(sampleFile('batch-split_part2')),
    )

    const body = added.body as ImportDetail
    const part2 = body.files[1]!.sheets.map((s) => s.sheetId)
    expect(body.readiness.canAnalyze).toBe(false)
    expect(body.readiness.missing.map((m) => [m.sheetId, m.field])).toEqual(part2.map((id) => [id, 'confirmation']))
    expect(body.readiness.missing[0]?.message).toBe(
      `The mapping of sheet "${body.files[1]!.sheets[0]!.sheetName}" is not confirmed`,
    )
  })

  it('leaves an uploaded import without confirmation items', () => {
    const detail = seedImport('batch-split', { labels: ['batch-split_part1'] })

    expect(detail.readiness.missing.some((m) => m.field === 'confirmation')).toBe(false)
  })
})
