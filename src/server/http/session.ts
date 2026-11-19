// How the route wrapper and the pages learn who is signed in. The app reads the
// Better Auth session (src/server/auth/session.ts); tests pass their own reader.

import type { Language } from "../../shared/languages";

export type { Language };

export type SessionUser = {
  id: string;
  /** Null until the user picks a language during onboarding. */
  language: Language | null;
  onboarded: boolean;
};

/**
 * Returns the signed-in user for a request, or null when there is no valid
 * session. When the session is renewed, the reader appends the new cookie to
 * `responseHeaders`, if given, so it reaches the browser (BR-03).
 */
export type SessionReader = (
  headers: Headers,
  responseHeaders?: Headers,
) => Promise<SessionUser | null>;

/** A reader for which no request has a session. */
export const noSessionReader: SessionReader = async () => null;
