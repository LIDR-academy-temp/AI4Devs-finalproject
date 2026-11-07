// Cleanup of a scenario that fails half way (design D6): through the API, because the screen that failed may not be
// usable. What to do comes from the state alone (attemptActions, importActions); the calls go through a client, so the
// decision and the order are tested without the API. Tokens live only in memory, and no note carries a request body
// nor the password.
import { type ApiSession, apiSession, type SeededUser } from './api.ts'

export type AttemptStatus = 'processed' | 'paid' | 'undone'
export type ImportStatus = 'uploaded' | 'mapped' | 'analyzed' | 'validated' | 'processed' | 'cancelled'

export interface CleanupAction {
  kind: 'unpay' | 'undo' | 'cancel'
  id: string
  /** analyst may undo and cancel but not unpay; payments, the other way round (README §2.5). */
  as: SeededUser
}

export interface CleanupClient {
  attemptStatus(batchId: string): Promise<AttemptStatus>
  importStatus(importId: string): Promise<ImportStatus>
  run(action: CleanupAction, reason: string): Promise<void>
}

export const CLEANUP_REASON = 'E2E cleanup after a failure'

export function attemptActions(id: string, status: AttemptStatus): CleanupAction[] {
  if (status === 'paid') {
    return [
      { kind: 'unpay', id, as: 'payments' },
      { kind: 'undo', id, as: 'analyst' },
    ]
  }
  return status === 'processed' ? [{ kind: 'undo', id, as: 'analyst' }] : []
}

const OPEN: readonly ImportStatus[] = ['uploaded', 'mapped', 'analyzed', 'validated']

export function importActions(id: string, status: ImportStatus): CleanupAction[] {
  return OPEN.includes(status) ? [{ kind: 'cancel', id, as: 'analyst' }] : []
}

/** The first line of an error, without the password should it ever carry it. */
function oneLine(error: unknown): string {
  const line = (error instanceof Error ? error.message : String(error)).split('\n')[0]!.trim()
  const password = process.env.SEED_PASSWORD
  return password ? line.split(password).join('***') : line
}

/**
 * Undoes the attempts first (an undo returns its import to analyzed) and then cancels the imports still open. A
 * failure stops only the actions of its own attempt or import; it is returned as a note, so the test reports it
 * without hiding the error of the scenario.
 */
export async function cleanUp(
  created: { importIds: readonly string[]; batchIds: readonly string[] },
  client: CleanupClient,
  reason = CLEANUP_REASON,
): Promise<string[]> {
  const notes: string[] = []
  const runAll = async (actions: CleanupAction[]) => {
    for (const action of actions) {
      try {
        await client.run(action, reason)
      } catch (error) {
        notes.push(`${action.kind} of ${action.id} failed: ${oneLine(error)}`)
        return
      }
    }
  }
  for (const id of created.batchIds) {
    let status: AttemptStatus
    try {
      status = await client.attemptStatus(id)
    } catch (error) {
      notes.push(`state of attempt ${id} could not be read: ${oneLine(error)}`)
      continue
    }
    await runAll(attemptActions(id, status))
  }
  for (const id of created.importIds) {
    let status: ImportStatus
    try {
      status = await client.importStatus(id)
    } catch (error) {
      notes.push(`state of import ${id} could not be read: ${oneLine(error)}`)
      continue
    }
    await runAll(importActions(id, status))
  }
  return notes
}

/** The client of the real API (support/api.ts): each user signs in once, on first use. */
export function apiClient(api: ApiSession = apiSession()): CleanupClient {
  return {
    attemptStatus: async (id) => (await api.get<{ status: AttemptStatus }>('analyst', `/settlements/${id}`)).status,
    importStatus: async (id) => (await api.get<{ status: ImportStatus }>('analyst', `/imports/${id}`)).status,
    run: async (action, reason) => {
      const path =
        action.kind === 'cancel' ? `/imports/${action.id}/cancel` : `/settlements/${action.id}/${action.kind}`
      await api.post(action.as, path, { reason })
    },
  }
}
