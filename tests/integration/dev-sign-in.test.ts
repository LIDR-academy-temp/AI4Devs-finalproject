import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";

import { seedIds } from "../../scripts/seed-data";
import { getMe } from "../../src/app/api/v1/me/definitions";
import { createSessionReader } from "../../src/server/auth/session";
import { users } from "../../src/server/db/schema";
import { createRouteHandler } from "../../src/server/http/route";
import {
  apiRequest,
  createTestDatabase,
  TEST_APP_URL,
  testDependencies,
} from "../support/routes";
import { SESSION_COOKIE, setCookies, testAuth } from "../support/sessions";

// The development-only sign-in (docs/03-ARCHITECTURE.md, section 3).

const { pool, db } = createTestDatabase();
afterAll(() => pool.end());

const withDevSignIn = testAuth(db, { devSignIn: true });
const withoutDevSignIn = testAuth(db);

function devSignIn(auth: typeof withDevSignIn, email: string) {
  return auth.handler(
    new Request(new URL("/api/auth/dev/sign-in", TEST_APP_URL), {
      method: "POST",
      headers: { origin: TEST_APP_URL, "content-type": "application/json" },
      body: JSON.stringify({ email }),
    }),
  );
}

/** Signs in and reads GET /me with the cookie the sign-in set. */
async function signInAndReadMe(email: string) {
  const response = await devSignIn(withDevSignIn, email);
  expect(response.status).toBe(200);
  const cookie = setCookies(response).get(SESSION_COOKIE);
  expect(cookie).toBeDefined();
  const handler = createRouteHandler(
    getMe,
    testDependencies({ db, readSession: createSessionReader(withDevSignIn) }),
  );
  const me = await handler(
    apiRequest("/me", { headers: { cookie: cookie!.split(";")[0]! } }),
  );
  expect(me.status).toBe(200);
  return me.json();
}

describe("development sign-in", () => {
  it("T-04 the development sign-in signs in a seed user", async () => {
    const me = await signInAndReadMe("ana@example.com");

    expect(me).toMatchObject({ id: seedIds.users.ana, onboarded: true });
  });

  it("T-04 the development sign-in creates a new user", async () => {
    const email = `new-${randomUUID()}@example.com`;

    const me = await signInAndReadMe(email);

    expect(me).toMatchObject({
      email,
      onboarded: false,
      language: null,
      whatsappNumber: null,
      memberships: [],
    });
    const [row] = await db.select().from(users).where(eq(users.email, email));
    expect(row).toMatchObject({ emailVerified: true, onboardedAt: null });
  });

  it("T-04 signing in again with the same email gives the same user", async () => {
    const email = `again-${randomUUID()}@example.com`;

    const first = await signInAndReadMe(email);
    const second = await signInAndReadMe(email.toUpperCase());

    expect(second.id).toBe(first.id);
  });

  it("T-04 the development sign-in doesn't exist when the setting is off", async () => {
    const response = await devSignIn(withoutDevSignIn, "ana@example.com");

    expect(response.status).toBe(404);
    expect(setCookies(response).has(SESSION_COOKIE)).toBe(false);
  });

  it("T-04 the development sign-in refuses another origin", async () => {
    const response = await withDevSignIn.handler(
      new Request(new URL("/api/auth/dev/sign-in", TEST_APP_URL), {
        method: "POST",
        headers: {
          origin: "https://evil.example",
          cookie: "anything=1",
          "content-type": "application/json",
        },
        body: JSON.stringify({ email: "ana@example.com" }),
      }),
    );

    expect(response.status).toBe(403);
  });
});
