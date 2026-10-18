// The fake import API on its own, without screens (design D12): state machine, fingerprint, error codes and scope.
import { describe, expect, it } from 'vitest'
import type { ImportDetail, ImportRowsPage } from '@/lib/api/types'
import { ACCOUNT_IDS, type UserName } from './fixtures'
import { issueTokens } from './handlers'
import { holdNext, sampleFile, seedImport } from './imports'

const MiB20 = 20 * 1024 * 1024

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
    expect(analyzed.body.analysis.rows).toEqual({ total: 783, matched: 780, unmatched: 0, ambiguous: 0, ignored: 3 })

    const rows = await call('analyst', 'GET', `/imports/${id}/rows?match=matched&page=16&pageSize=50`)
    const page = rows.body as ImportRowsPage
    expect(page.total).toBe(780)
    expect(page.items).toHaveLength(30)
    expect(page.items.every((r) => r.matchResult === 'matched')).toBe(true)

    const notEditable = await call('analyst', 'PUT', `/imports/${id}/mapping`, proposalOf(detail))
    expect(notEditable.status).toBe(409)
    expect(notEditable.body).toMatchObject({ code: 'import_not_editable', details: { status: 'analyzed' } })

    const cancelled = await call('analyst', 'POST', `/imports/${id}/cancel`)
    expect(cancelled.status).toBe(200)
    expect(cancelled.body.status).toBe('cancelled')
    const again = await call('analyst', 'POST', `/imports/${id}/cancel`)
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
    expect((await call('viewer', 'POST', `/imports/${own.importId}/cancel`)).status).toBe(403)
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
