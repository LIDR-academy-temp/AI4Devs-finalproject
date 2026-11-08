// Run with `node --test support/` from e2e/ (design D11): the cleanup of a scenario that fails half way.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  type AttemptStatus,
  attemptActions,
  CLEANUP_REASON,
  type CleanupAction,
  type CleanupClient,
  cleanUp,
  createdBy,
  type ImportStatus,
  importActions,
} from './cleanup.ts'

describe('what a response of the API created, for the cleanup', () => {
  const API = 'http://localhost:5173/api/v1'

  it('the POST that creates an import: its importId', () => {
    assert.deepEqual(createdBy('POST', `${API}/accounts/a1/imports`, 201, { importId: 'i1' }), { importId: 'i1' })
  })

  it('the POST that processes a batch: its batchId, before the summary opens', () => {
    assert.deepEqual(createdBy('POST', `${API}/imports/i1/settlements`, 201, { batchId: 'b1', batchNo: 123 }), {
      batchId: 'b1',
    })
  })

  // Each body carries an id, so the route, the status and the method decide, not the shape of the body.
  it('nothing for the preview, for adding a file, for a refused request or for a read', () => {
    const ids = { importId: 'i1', batchId: 'b1' }
    assert.equal(createdBy('POST', `${API}/imports/i1/settlements/preview`, 200, ids), undefined)
    assert.equal(createdBy('POST', `${API}/imports/i1/files`, 201, ids), undefined)
    assert.equal(createdBy('POST', `${API}/imports/i1/settlements`, 409, ids), undefined)
    assert.equal(createdBy('GET', `${API}/accounts/a1/imports`, 200, ids), undefined)
  })
})

describe('what the cleanup does for each state', () => {
  it('a paid attempt: payments unpays, then analyst undoes', () => {
    assert.deepEqual(attemptActions('b1', 'paid'), [
      { kind: 'unpay', id: 'b1', as: 'payments' },
      { kind: 'undo', id: 'b1', as: 'analyst' },
    ])
  })

  it('a processed attempt: analyst undoes', () => {
    assert.deepEqual(attemptActions('b1', 'processed'), [{ kind: 'undo', id: 'b1', as: 'analyst' }])
  })

  it('an undone attempt: nothing', () => {
    assert.deepEqual(attemptActions('b1', 'undone'), [])
  })

  for (const status of ['uploaded', 'mapped', 'analyzed', 'validated'] as const) {
    it(`an import ${status}: analyst cancels it`, () => {
      assert.deepEqual(importActions('i1', status), [{ kind: 'cancel', id: 'i1', as: 'analyst' }])
    })
  }

  for (const status of ['cancelled', 'processed'] as const) {
    it(`an import ${status}: nothing`, () => {
      assert.deepEqual(importActions('i1', status), [])
    })
  }
})

/** A client that answers from fixed states and records what it was asked to do. */
function fakeClient(
  attempts: Record<string, AttemptStatus>,
  imports: Record<string, ImportStatus>,
  failing: Partial<Record<string, Error>> = {},
) {
  const calls: string[] = []
  const client: CleanupClient = {
    attemptStatus: async (id) => attempts[id]!,
    // An undo returns its import to analyzed, as the API does: the import is read after the attempts.
    importStatus: async (id) => imports[id]!,
    run: async (action: CleanupAction, reason: string) => {
      calls.push(`${action.kind} ${action.id} as ${action.as}: ${reason}`)
      const error = failing[`${action.kind} ${action.id}`]
      if (error) throw error
      if (action.kind === 'undo') for (const key of Object.keys(imports)) imports[key] = 'analyzed'
    },
  }
  return { client, calls }
}

describe('cleanUp', () => {
  it('undoes the attempts first and then cancels the imports, with the reason of the cleanup', async () => {
    const { client, calls } = fakeClient({ b1: 'paid' }, { i1: 'processed' })
    const notes = await cleanUp({ importIds: ['i1'], batchIds: ['b1'] }, client)

    assert.deepEqual(calls, [
      `unpay b1 as payments: ${CLEANUP_REASON}`,
      `undo b1 as analyst: ${CLEANUP_REASON}`,
      `cancel i1 as analyst: ${CLEANUP_REASON}`,
    ])
    assert.deepEqual(notes, [])
  })

  it('does nothing for what is already closed', async () => {
    const { client, calls } = fakeClient({ b1: 'undone' }, { i1: 'cancelled' })
    assert.deepEqual(await cleanUp({ importIds: ['i1'], batchIds: ['b1'] }, client), [])
    assert.deepEqual(calls, [])
  })

  it('a failure stops only its own attempt, goes on with the rest, and is returned as one line', async () => {
    const { client, calls } = fakeClient(
      { b1: 'paid', b2: 'processed' },
      { i1: 'validated' },
      { 'unpay b1': new Error('409 settlement_not_paid\n    at request (cleanup.ts:1:1)') },
    )
    const notes = await cleanUp({ importIds: ['i1'], batchIds: ['b1', 'b2'] }, client)

    assert.deepEqual(calls, [
      `unpay b1 as payments: ${CLEANUP_REASON}`,
      `undo b2 as analyst: ${CLEANUP_REASON}`,
      `cancel i1 as analyst: ${CLEANUP_REASON}`,
    ])
    assert.deepEqual(notes, ['unpay of b1 failed: 409 settlement_not_paid'])
  })

  it('never returns the password, even if an error carries it', async () => {
    const previous = process.env.SEED_PASSWORD
    process.env.SEED_PASSWORD = 'not-the-real-one'
    try {
      const { client } = fakeClient(
        {},
        { i1: 'mapped' },
        { 'cancel i1': new Error('login failed for not-the-real-one') },
      )
      const notes = await cleanUp({ importIds: ['i1'], batchIds: [] }, client)
      assert.equal(notes.length, 1)
      assert.ok(!notes[0]!.includes('not-the-real-one'), notes[0])
    } finally {
      // Assigning undefined would leave the string "undefined": a variable that did not exist is removed.
      if (previous === undefined) delete process.env.SEED_PASSWORD
      else process.env.SEED_PASSWORD = previous
    }
  })

  it('a state that cannot be read is noted, and the others go on', async () => {
    const { client, calls } = fakeClient({}, { i2: 'analyzed' })
    client.importStatus = async (id) => {
      if (id === 'i1') throw new Error('404 not_found')
      return 'analyzed'
    }
    const notes = await cleanUp({ importIds: ['i1', 'i2'], batchIds: [] }, client)

    assert.deepEqual(calls, [`cancel i2 as analyst: ${CLEANUP_REASON}`])
    assert.deepEqual(notes, ['state of import i1 could not be read: 404 not_found'])
  })
})
