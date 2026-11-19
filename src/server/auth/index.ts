import { headers } from "next/headers";
import { cache } from "react";

import { db } from "../db/client";
import type { SessionUser } from "../http/session";
import { type Auth, createAuth } from "./auth";
import { devSignInEnabled } from "./dev-sign-in-setting";
import { createSessionReader } from "./session";

// The app's Better Auth instance, from the environment variables in
// docs/06-INFRASTRUCTURE.md, section 7. Built on first use, so building the app
// doesn't need them.

let instance: Auth | undefined;

function required(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(
      `${name} isn't set (docs/06-INFRASTRUCTURE.md, section 7).`,
    );
  return value;
}

export function getAuth(): Auth {
  if (!instance) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    instance = createAuth({
      db,
      appUrl: required("APP_URL"),
      secret: required("BETTER_AUTH_SECRET"),
      google: clientId && clientSecret ? { clientId, clientSecret } : undefined,
      devSignIn: devSignInEnabled(process.env.DEV_SIGN_IN),
    });
  }
  return instance;
}

/** Whether Welcome offers Google sign-in, which needs the OAuth client. */
export function googleSignInAvailable(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
}

/** Whether Welcome offers the development-only sign-in. */
export function devSignInAvailable(): boolean {
  return devSignInEnabled(process.env.DEV_SIGN_IN);
}

/** The session reader for /api/v1 and the proxy, which renew the session. */
export const readSession = (
  requestHeaders: Headers,
  responseHeaders?: Headers,
) => createSessionReader(getAuth())(requestHeaders, responseHeaders);

/**
 * The signed-in user for the page being rendered, read once per request.
 * Pages can't send cookies, and the proxy has already renewed the session, so
 * this never renews it.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> =>
  createSessionReader(getAuth(), { renew: false })(await headers()),
);
