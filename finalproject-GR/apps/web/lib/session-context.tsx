'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useSession, type UseSessionResult } from './use-session';

const SessionContext = createContext<UseSessionResult | null>(null);

/**
 * Fetches the session once and shares it via context, so the shell and the pages it
 * wraps don't each re-fetch GET /me and GET /projects/:projectId.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSessionContext(): UseSessionResult {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  return ctx;
}
