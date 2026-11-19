import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { createAuthHandler } from "../../src/server/auth/handler";
import { accounts, sessions, users } from "../../src/server/db/schema";
import { createAccount, createUser } from "../support/factories";
import { createTestDatabase, TEST_APP_URL } from "../support/routes";
import { SESSION_COOKIE, setCookies, testAuth } from "../support/sessions";

// Google sign-in through Better Auth's own sign-in and callback (FR-01,
// BR-02). Google's token endpoint is answered by the test, so Google itself is
// never called (docs/07-SECURITY-AND-TESTING.md, section 2.4).

const { pool, db } = createTestDatabase();
afterAll(() => pool.end());
afterEach(() => vi.restoreAllMocks());

const auth = testAuth(db, { google: true });
const handle = createAuthHandler(() => auth);

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

type GoogleProfile = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
};

/** An unsigned ID token: Better Auth reads the profile from the token Google's endpoint returns. */
function idToken(profile: GoogleProfile): string {
  const part = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "none", typ: "JWT" })}.${part({
    iss: "https://accounts.google.com",
    aud: "test-client-id",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    name: "Marta López",
    ...profile,
  })}.`;
}

/** Answers Google's token endpoint with the profile and lets every other request through. */
function googleAnswers(profile: GoogleProfile) {
  const realFetch = globalThis.fetch;
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (!url.startsWith(GOOGLE_TOKEN_ENDPOINT)) return realFetch(input, init);
      return Response.json({
        access_token: "test-access-token",
        token_type: "Bearer",
        expires_in: 3600,
        id_token: idToken(profile),
      });
    });
}

function cookieHeader(response: Response): string {
  return [...setCookies(response).values()]
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

/** Starts a Google sign-in, returns from Google with the profile, and returns the callback's response. */
async function signInWithGoogle(profile: GoogleProfile): Promise<Response> {
  const start = await handle(
    new Request(new URL("/api/auth/sign-in/social", TEST_APP_URL), {
      method: "POST",
      headers: { origin: TEST_APP_URL, "content-type": "application/json" },
      body: JSON.stringify({
        provider: "google",
        callbackURL: "/lists",
        errorCallbackURL: "/?error=sign-in",
      }),
    }),
  );
  expect(start.status).toBe(200);
  const { url } = (await start.json()) as { url: string };
  const state = new URL(url).searchParams.get("state");
  expect(state).toBeTruthy();

  googleAnswers(profile);
  const callback = new URL("/api/auth/callback/google", TEST_APP_URL);
  callback.search = new URLSearchParams({
    code: "test-code",
    state: state!,
  }).toString();
  return handle(
    new Request(callback, { headers: { cookie: cookieHeader(start) } }),
  );
}

function newProfile(values: Partial<GoogleProfile> = {}): GoogleProfile {
  return {
    sub: randomUUID(),
    email: `${randomUUID()}@example.com`,
    email_verified: true,
    ...values,
  };
}

async function googleAccount(accountId: string) {
  const [row] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.accountId, accountId));
  return row;
}

async function sessionsOf(userId: string) {
  return db.select().from(sessions).where(eq(sessions.userId, userId));
}

describe("Google sign-in", () => {
  it("FR-01 a first Google sign-in creates the account and signs the user in", async () => {
    const profile = newProfile();

    const response = await signInWithGoogle(profile);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/lists");
    expect(setCookies(response).has(SESSION_COOKIE)).toBe(true);
    const account = await googleAccount(profile.sub);
    expect(account?.providerId).toBe("google");
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, account!.userId));
    expect(user).toMatchObject({
      email: profile.email,
      name: "Marta López",
      onboardedAt: null,
    });
  });

  it("BR-02 a returning identity signs in as the same user after its email changes", async () => {
    const profile = newProfile();
    await signInWithGoogle(profile);
    const { userId } = (await googleAccount(profile.sub))!;

    const response = await signInWithGoogle({
      ...profile,
      email: `${randomUUID()}@example.com`,
    });

    expect(response.headers.get("location")).toBe("/lists");
    expect(await sessionsOf(userId)).toHaveLength(2);
    const google = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId));
    expect(google).toHaveLength(1);
  });

  it("BR-02 an identity whose email matches another user is not linked to them", async () => {
    // A verified email and no Google identity yet, so only BR-02 stops a link.
    const existing = await createUser(db, { emailVerified: true });
    await createAccount(db, { userId: existing.id, providerId: "apple" });

    const response = await signInWithGoogle(
      newProfile({ email: existing.email! }),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "/?error=sign-in&error=account_not_linked",
    );
    expect(setCookies(response).has(SESSION_COOKIE)).toBe(false);
    expect(await sessionsOf(existing.id)).toEqual([]);
    const identities = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, existing.id));
    expect(identities.map((identity) => identity.providerId)).toEqual([
      "apple",
    ]);
  });

  it("BR-02 a Google profile without a verified email is refused", async () => {
    const profile = newProfile({ email_verified: false });

    const response = await signInWithGoogle(profile);

    expect(response.headers.get("location")).toMatch(/^\/\?error=sign-in/);
    expect(setCookies(response).has(SESSION_COOKIE)).toBe(false);
    expect(await googleAccount(profile.sub)).toBeUndefined();
    const created = await db
      .select()
      .from(users)
      .where(eq(users.email, profile.email));
    expect(created).toEqual([]);
  });
});

describe("the Better Auth endpoints the app serves", () => {
  it("T-04 Better Auth's own account changes are not served", async () => {
    const existing = await createUser(db, { name: "Marta López" });

    for (const [method, path, body] of [
      ["POST", "/api/auth/update-user", { name: "x".repeat(300) }],
      ["POST", "/api/auth/delete-user", {}],
      ["POST", "/api/auth/sign-up/email", { email: existing.email }],
      ["GET", "/api/auth/list-accounts", undefined],
      ["GET", "/api/auth/sign-out", undefined],
    ] as const) {
      const response = await handle(
        new Request(new URL(path, TEST_APP_URL), {
          method,
          headers: { origin: TEST_APP_URL, "content-type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        }),
      );
      expect(response.status, `${method} ${path}`).toBe(404);
    }
  });
});
