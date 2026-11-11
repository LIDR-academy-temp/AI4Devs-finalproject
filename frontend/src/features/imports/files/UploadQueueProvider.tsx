import type { QueryClient } from '@tanstack/react-query'
import { createContext, type ReactNode, useContext, useSyncExternalStore } from 'react'
import type { AppRouter } from '@/app/router'
import { addImportFile, createImport, storeDetail } from '../mutations'
import { UploadQueue } from './upload-queue'

const QueueContext = createContext<UploadQueue | null>(null)

/** Makes the tab's upload queue (created by App, above the router) reachable from the screens. */
export function UploadQueueProvider({ queue, children }: { queue: UploadQueue; children: ReactNode }) {
  return <QueueContext.Provider value={queue}>{children}</QueueContext.Provider>
}

/**
 * The tab's upload queue (design D4). When the first file creates the import and the user is still on New
 * Reconciliation, the app moves to the import's Files step without waiting for the rest.
 */
export function createUploadQueue(router: AppRouter, queryClient: QueryClient) {
  return new UploadQueue({
    create: createImport,
    add: addImportFile,
    onDetail: (detail) => storeDetail(queryClient, detail),
    onCreated: (detail) => {
      if (router.state.location.pathname !== '/reconciliations/new') return
      void router.navigate({
        to: '/imports/$importId',
        params: { importId: detail.importId },
        search: { step: 'files' },
        replace: true,
      })
    },
  })
}

export function useUploadQueue(): UploadQueue {
  const queue = useContext(QueueContext)
  if (!queue) throw new Error('useUploadQueue outside UploadQueueProvider')
  return queue
}

/** Re-renders on every change of the queue. */
export function useQueueSnapshot(queue: UploadQueue) {
  return useSyncExternalStore(queue.subscribe, queue.getSnapshot)
}
