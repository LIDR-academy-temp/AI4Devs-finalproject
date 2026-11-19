import { makeSignature } from "better-auth/crypto";

import { createAuth } from "../../src/server/auth/auth";
import type { Database } from "../../src/server/db/client";
import { createSession } from "./factories";
import { TEST_APP_URL } from "./routes";

// Real Better Auth sessions for integration tests. Better Auth reads the system
// time, so tests date the session rows instead of setting a clock
// (docs/07-SECURITY-AND-TESTING.md, section 2.4).

export const TEST_AUTH_SECRET = "test-only-secret-with-at-least-32-characters";

/** Better Auth's session cookie name on http, where cookies aren't `Secure`. */
export const SESSION_COOKIE = "better-auth.session_token";

export const DAY_MS = 24 * 60 * 60 * 1000;

export function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * DAY_MS);
}

/** Google credentials for tests; the tests answer Google's token endpoint themselves. */
export const TEST_GOOGLE = {
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
};

export function testAuth(
  db: Database,
  { devSignIn = false, google = false } = {},
) {
  return createAuth({
    db,
    appUrl: TEST_APP_URL,
    secret: TEST_AUTH_SECRET,
    devSignIn,
    ...(google ? { google: TEST_GOOGLE } : {}),
  });
}

/** The `cookie` request header that carries a session token, signed as Better Auth signs it. */
export async function sessionCookie(token: string): Promise<string> {
  const signature = await makeSignature(token, TEST_AUTH_SECRET);
  return `${SESSION_COOKIE}=${encodeURIComponent(`${token}.${signature}`)}`;
}

/**
 * Inserts a session for the user, dated as the test needs, and returns it with
 * the cookie that signs a request in with it.
 */
export async function signIn(
  db: Database,
  userId: string,
  dates: { createdAt?: Date; updatedAt?: Date; expiresAt?: Date } = {},
) {
  const session = await createSession(db, {
    userId,
    createdAt: dates.createdAt ?? new Date(),
    updatedAt: dates.updatedAt ?? new Date(),
    expiresAt: dates.expiresAt ?? daysFromNow(30),
  });
  return { session, cookie: await sessionCookie(session.token) };
}

/** The session cookies a response sets, by name. */
export function setCookies(response: Response): Map<string, string> {
  return new Map(
    response.headers.getSetCookie().map((cookie) => {
      const [pair = ""] = cookie.split(";");
      const index = pair.indexOf("=");
      return [pair.slice(0, index), cookie];
    }),
  );
}
