import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { fieldLimits } from "../../shared/limits";
import type { Database } from "../db/client";
import { accounts, sessions, users, verifications } from "../db/schema";
import { checkDevSignInSetting } from "./dev-sign-in-setting";
import { devSignIn } from "./dev-sign-in";

// Sign-in with Google, identities, and database sessions (FR-01, BR-02, BR-03),
// configured as docs/03-ARCHITECTURE.md describes. Built by a factory so tests
// can use the test database and turn on the development sign-in (design
// decision 1 of the T-04 change).

const DAY = 24 * 60 * 60;

/** BR-03: the session ends after 30 days without use, renewed at most once a day. */
export const SESSION_EXPIRES_IN = 30 * DAY;
export const SESSION_UPDATE_AGE = DAY;

export type AuthSettings = {
  db: Database;
  /** The app's own address, Better Auth's base address, and its only trusted origin. */
  appUrl: string;
  secret: string;
  google?: { clientId: string; clientSecret: string };
  /** Registers the development-only sign-in (docs/03-ARCHITECTURE.md, section 3). */
  devSignIn: boolean;
};

type ProviderUser = { emailVerified?: unknown };
type ProviderSource = { method: string };

/**
 * BR-02: any provider must supply a verified email address. Refuses a provider
 * identity without one, whether it would create a user or sign one in.
 */
export function checkProviderUser(
  user: ProviderUser,
  source: ProviderSource,
): { error: string; errorDescription: string } | undefined {
  if (source.method === "oauth" && user.emailVerified !== true) {
    return {
      error: "EMAIL_NOT_VERIFIED",
      errorDescription:
        "The sign-in provider didn't confirm this email address.",
    };
  }
  return undefined;
}

/** Shortens a provider's name to what `users.name` holds, by whole characters. */
export function fitName(name: string | undefined): string {
  return Array.from((name ?? "").trim())
    .slice(0, fieldLimits.name.max)
    .join("");
}

export function authOptions(settings: AuthSettings) {
  checkDevSignInSetting({
    devSignIn: settings.devSignIn,
    appUrl: settings.appUrl,
  });
  const origin = new URL(settings.appUrl).origin;

  return {
    baseURL: origin,
    basePath: "/api/auth",
    secret: settings.secret,
    trustedOrigins: [origin],
    database: drizzleAdapter(settings.db, {
      provider: "pg",
      usePlural: true,
      schema: { users, accounts, sessions, verifications },
    }),
    session: {
      expiresIn: SESSION_EXPIRES_IN,
      updateAge: SESSION_UPDATE_AGE,
      // Every request checks the database (docs/07-SECURITY-AND-TESTING.md, section 1).
      cookieCache: { enabled: false },
    },
    account: {
      // BR-02: an identity matches only by its provider and the provider's
      // user ID. An email shared with another user never links them.
      accountLinking: { disableImplicitLinking: true },
    },
    user: {
      additionalFields: {
        language: { type: "string", required: false, input: false },
        onboardedAt: { type: "date", required: false, input: false },
      },
      validateUserInfo: ({ user, source }) => checkProviderUser(user, source),
    },
    socialProviders: settings.google
      ? {
          google: {
            clientId: settings.google.clientId,
            clientSecret: settings.google.clientSecret,
            mapProfileToUser: (profile) => ({ name: fitName(profile.name) }),
          },
        }
      : {},
    advanced: {
      database: { generateId: "uuid" },
      // Better Auth skips its origin check when it detects a test run. Keep it
      // on everywhere, so the tests check what production does
      // (docs/07-SECURITY-AND-TESTING.md, section 1).
      disableOriginCheck: false,
      // The sessions.ip_address column stays empty (docs/04-DATA-MODEL.md).
      ipAddress: { disableIpTracking: true },
      useSecureCookies: settings.appUrl.startsWith("https://"),
    },
    plugins: settings.devSignIn ? [devSignIn()] : [],
    telemetry: { enabled: false },
  } satisfies BetterAuthOptions;
}

export function createAuth(settings: AuthSettings) {
  return betterAuth(authOptions(settings));
}

export type Auth = ReturnType<typeof createAuth>;
