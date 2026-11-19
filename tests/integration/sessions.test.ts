import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { seedIds } from "../../scripts/seed-data";
import { getMe } from "../../src/app/api/v1/me/definitions";
import { createSessionReader } from "../../src/server/auth/session";
import { sessions } from "../../src/server/db/schema";
import { createRouteHandler } from "../../src/server/http/route";
import { meSchema } from "../../src/server/http/schemas";
import {
  apiRequest,
  createTestDatabase,
  expectMatchesSchema,
  TEST_APP_URL,
  testDependencies,
} from "../support/routes";
import {
  DAY_MS,
  daysFromNow,
  SESSION_COOKIE,
  setCookies,
  signIn,
  testAuth,
} from "../support/sessions";

// Sessions through Better Auth (FR-01, BR-03), read by the real session reader
// (design decision 2 of the T-04 change).

const { pool, db } = createTestDatabase();
afterAll(() => pool.end());

const auth = testAuth(db);
const getMeHandler = createRouteHandler(
  getMe,
  testDependencies({ db, readSession: createSessionReader(auth) }),
);

const ana = seedIds.users.ana;

function meWith(cookie: string) {
  return getMeHandler(apiRequest("/me", { headers: { cookie } }));
}

async function storedSession(token: string) {
  const [row] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token));
  return row;
}

function signOut(cookie: string, origin = TEST_APP_URL) {
  return auth.handler(
    new Request(new URL("/api/auth/sign-out", TEST_APP_URL), {
      method: "POST",
      headers: { cookie, origin, "content-type": "application/json" },
      body: "{}",
    }),
  );
}

describe("sessions", () => {
  it("T-04 an endpoint reads a real session", async () => {
    const { cookie } = await signIn(db, ana);

    const response = await meWith(cookie);

    expect(response.status).toBe(200);
    const body = await response.json();
    expectMatchesSchema(meSchema, body);
    expect(body).toMatchObject({ id: ana, onboarded: true });
  });

  it("AC-05 a user who used the app 20 days ago is still signed in", async () => {
    // Signed in 45 days ago; the last use, 20 days ago, renewed the session for
    // 30 days from then.
    const { session, cookie } = await signIn(db, ana, {
      createdAt: daysFromNow(-45),
      updatedAt: daysFromNow(-20),
      expiresAt: daysFromNow(10),
    });

    const before = Date.now();
    const response = await meWith(cookie);

    expect(response.status).toBe(200);
    const renewed = await storedSession(session.token);
    expect(renewed?.expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + 30 * DAY_MS - 1000,
    );
    // The browser gets the cookie again with a fresh 30 days.
    const sent = setCookies(response).get(SESSION_COOKIE);
    expect(sent).toContain(`Max-Age=${30 * 24 * 60 * 60}`);
    expect(sent).toContain("HttpOnly");
    expect(sent).toContain("SameSite=Lax");
  });

  it("AC-06 a user who last used the app 31 days ago signs in again", async () => {
    const { session, cookie } = await signIn(db, ana, {
      createdAt: daysFromNow(-40),
      updatedAt: daysFromNow(-31),
      expiresAt: daysFromNow(-1),
    });

    const response = await meWith(cookie);

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("NOT_SIGNED_IN");
    expect(await storedSession(session.token)).toBeUndefined();
  });

  it("BR-03 a session used twice in one day is renewed once", async () => {
    const expiresAt = new Date(Date.now() + 30 * DAY_MS - 60 * 60 * 1000);
    const { session, cookie } = await signIn(db, ana, {
      updatedAt: new Date(Date.now() - 60 * 60 * 1000),
      expiresAt,
    });

    const response = await meWith(cookie);

    expect(response.status).toBe(200);
    expect((await storedSession(session.token))?.expiresAt).toEqual(expiresAt);
    expect(setCookies(response).has(SESSION_COOKIE)).toBe(false);
  });

  it("BR-03 signing out deletes the session", async () => {
    const { session, cookie } = await signIn(db, ana);

    const response = await signOut(cookie);

    expect(response.status).toBe(200);
    expect(await storedSession(session.token)).toBeUndefined();
    expect((await meWith(cookie)).status).toBe(401);
  });

  it("T-04 a sign-out from another origin is refused", async () => {
    const { session, cookie } = await signIn(db, ana);

    const response = await signOut(cookie, "https://evil.example");

    expect(response.status).toBe(403);
    expect(await storedSession(session.token)).toBeDefined();
    expect((await meWith(cookie)).status).toBe(200);
  });
});
