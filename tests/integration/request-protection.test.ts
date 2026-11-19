import { eq, like } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { seedIds } from "../../scripts/seed-data";
import en from "../../src/i18n/en.json";
import es from "../../src/i18n/es.json";
import { incrementRateLimitCounter } from "../../src/server/db/rate-limits";
import { rateLimits as rateLimitRows } from "../../src/server/db/schema";
import { createRouteHandler } from "../../src/server/http/route";
import { rateLimits } from "../../src/shared/limits";
import {
  apiRequest,
  createTestDatabase,
  testClock,
  testDependencies,
} from "../support/routes";

// Verifies the request protections in docs/07-SECURITY-AND-TESTING.md, section 1.

const { pool, db } = createTestDatabase();
afterAll(() => pool.end());

function okRoute(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  overrides: { clock?: ReturnType<typeof testClock>["clock"] } = {},
  rateLimit?: Parameters<typeof createRouteHandler>[0]["rateLimit"],
) {
  const service = vi.fn(async () => ({ ok: true }));
  const handler = createRouteHandler(
    {
      method,
      path: "/things",
      response: z.object({ ok: z.boolean() }),
      rateLimit,
      handler: service,
    },
    testDependencies({ db, ...overrides }),
  );
  return { service, handler };
}

async function codeOf(response: Response) {
  return ((await response.json()) as { error: { code: string } }).error.code;
}

// Each rate limit test starts in its own minute, five apart, so counters never
// carry over, even from a test that moves its clock into the next minute.
let minute = 0;
function freshClock() {
  minute += 5;
  return testClock(new Date(Date.UTC(2026, 10, 9, 10, minute, 5)));
}

describe("origin check", () => {
  it("T-03 rejects a change from another origin", async () => {
    const { service, handler } = okRoute("POST");

    const response = await handler(
      apiRequest("/things", {
        method: "POST",
        as: "ana",
        origin: "https://evil.example",
      }),
    );

    expect(response.status).toBe(403);
    expect(await codeOf(response)).toBe("FORBIDDEN");
    expect(service).not.toHaveBeenCalled();
  });

  it.each(["PATCH", "DELETE"] as const)(
    "T-03 change with no origin is rejected (%s)",
    async (method) => {
      const { service, handler } = okRoute(method);

      const response = await handler(
        apiRequest("/things", { method, as: "ana", origin: null }),
      );

      expect(response.status).toBe(403);
      expect(service).not.toHaveBeenCalled();
    },
  );

  it("T-03 change from the app's own origin passes", async () => {
    const { service, handler } = okRoute("POST");

    const response = await handler(
      apiRequest("/things", { method: "POST", as: "ana" }),
    );

    expect(response.status).toBe(200);
    expect(service).toHaveBeenCalledOnce();
  });

  it("T-03 a lookalike origin is rejected", async () => {
    const { handler } = okRoute("POST");
    for (const origin of [
      "http://localhost:3000.evil.example",
      "https://localhost:3000",
      "http://localhost:3001",
      "null",
    ]) {
      const response = await handler(
        apiRequest("/things", { method: "POST", as: "ana", origin }),
      );
      expect(response.status).toBe(403);
    }
  });

  it("T-03 the origin is checked before the session", async () => {
    const { handler } = okRoute("POST");
    const response = await handler(
      apiRequest("/things", { method: "POST", origin: "https://evil.example" }),
    );
    expect(response.status).toBe(403);
  });

  it("T-03 reading data needs no origin", async () => {
    const { service, handler } = okRoute("GET");
    const response = await handler(apiRequest("/things", { as: "ana" }));
    expect(response.status).toBe(200);
    expect(service).toHaveBeenCalledOnce();
  });

  it("T-03 without APP_URL, every change is refused", async () => {
    const service = vi.fn(async () => ({ ok: true }));
    const handler = createRouteHandler(
      {
        method: "POST",
        path: "/things",
        response: z.object({ ok: z.boolean() }),
        handler: service,
      },
      testDependencies({ db, appUrl: undefined }),
    );
    const response = await handler(
      apiRequest("/things", { method: "POST", as: "ana" }),
    );
    expect(response.status).toBe(403);
    expect(service).not.toHaveBeenCalled();
  });
});

describe("rate limits", () => {
  const { limit } = rateLimits.anyRequest;

  async function useWholeLimit(
    handler: ReturnType<typeof okRoute>["handler"],
    as: "ana" | "rosa",
  ) {
    for (let request = 0; request < limit; request += 1) {
      const response = await handler(apiRequest("/things", { as }));
      expect(response.status).toBe(200);
    }
  }

  it("AC-97 request over the rate limit is rejected with a friendly message", async () => {
    const time = freshClock();
    const { service, handler } = okRoute("GET", { clock: time.clock });
    await useWholeLimit(handler, "ana");
    service.mockClear();

    const english = await handler(apiRequest("/things", { as: "ana" }));
    expect(english.status).toBe(429);
    expect(await english.json()).toEqual({
      error: { code: "RATE_LIMITED", message: en.errors.RATE_LIMITED },
    });
    expect(service).not.toHaveBeenCalled();

    await useWholeLimit(handler, "rosa");
    const spanish = await handler(apiRequest("/things", { as: "rosa" }));
    expect(spanish.status).toBe(429);
    expect(
      ((await spanish.json()) as { error: { message: string } }).error.message,
    ).toBe(es.errors.RATE_LIMITED);
  });

  it("T-03 requests under the limit pass", async () => {
    const time = freshClock();
    const { service, handler } = okRoute("GET", { clock: time.clock });
    await useWholeLimit(handler, "ana");
    expect(service).toHaveBeenCalledTimes(limit);
  });

  it("T-03 the limit resets in the next window", async () => {
    const time = freshClock();
    const { handler } = okRoute("GET", { clock: time.clock });
    await useWholeLimit(handler, "ana");
    expect((await handler(apiRequest("/things", { as: "ana" }))).status).toBe(
      429,
    );

    time.set(new Date(time.clock().getTime() + 60_000));
    expect((await handler(apiRequest("/things", { as: "ana" }))).status).toBe(
      200,
    );
  });

  it("T-03 each user has their own count", async () => {
    const time = freshClock();
    const { handler } = okRoute("GET", { clock: time.clock });
    await useWholeLimit(handler, "ana");

    expect((await handler(apiRequest("/things", { as: "rosa" }))).status).toBe(
      200,
    );
  });

  it("T-03 the counter rows have the expected key, count, and end of window", async () => {
    const time = freshClock();
    const { handler } = okRoute("GET", { clock: time.clock });
    for (let request = 0; request < 3; request += 1) {
      await handler(apiRequest("/things", { as: "ana" }));
    }

    const now = time.clock();
    const windowStart = new Date(now);
    windowStart.setUTCSeconds(0, 0);
    const [row] = await db
      .select()
      .from(rateLimitRows)
      .where(
        eq(
          rateLimitRows.key,
          `api:${seedIds.users.ana}:${windowStart.toISOString()}`,
        ),
      );
    expect(row).toEqual({
      key: `api:${seedIds.users.ana}:${windowStart.toISOString()}`,
      count: 3,
      expiresAt: new Date(windowStart.getTime() + 60_000),
    });
  });

  it("T-03 simultaneous requests are all counted", async () => {
    const key = `concurrency:${seedIds.users.ana}:${new Date().toISOString()}`;
    const expiresAt = new Date(Date.now() + 60_000);
    const requests = 25;

    // The pool opens up to 10 connections, so the upserts really run at once.
    await Promise.all(
      Array.from({ length: requests }, () =>
        incrementRateLimitCounter(db, key, expiresAt),
      ),
    );

    const [row] = await db
      .select()
      .from(rateLimitRows)
      .where(like(rateLimitRows.key, "concurrency:%"));
    expect(row.count).toBe(requests);
  });

  it("T-03 an action limit is counted separately", async () => {
    const time = freshClock();
    const actionLimit = { action: "test-action", limit: 2, windowSeconds: 60 };
    const limited = okRoute("POST", { clock: time.clock }, actionLimit);
    const other = okRoute("POST", { clock: time.clock });

    for (let request = 0; request < actionLimit.limit; request += 1) {
      const response = await limited.handler(
        apiRequest("/things", { method: "POST", as: "ana" }),
      );
      expect(response.status).toBe(200);
    }

    const over = await limited.handler(
      apiRequest("/things", { method: "POST", as: "ana" }),
    );
    expect(over.status).toBe(429);
    expect(await codeOf(over)).toBe("RATE_LIMITED");

    const otherAction = await other.handler(
      apiRequest("/things", { method: "POST", as: "ana" }),
    );
    expect(otherAction.status).toBe(200);

    // The limit for any request still counts every one of them, including
    // those on the action-limited route.
    const windowStart = new Date(time.clock());
    windowStart.setUTCSeconds(0, 0);
    const [general] = await db
      .select({ count: rateLimitRows.count })
      .from(rateLimitRows)
      .where(
        eq(
          rateLimitRows.key,
          `api:${seedIds.users.ana}:${windowStart.toISOString()}`,
        ),
      );
    expect(general.count).toBe(actionLimit.limit + 2);
  });

  it("T-03 requests without a session are not counted", async () => {
    const time = freshClock();
    const handler = createRouteHandler(
      {
        method: "GET",
        path: "/public",
        access: "public",
        response: z.object({}),
        handler: async () => ({}),
      },
      testDependencies({ db, clock: time.clock }),
    );
    const before = await db.select().from(rateLimitRows);
    await handler(apiRequest("/public"));
    expect(await db.select().from(rateLimitRows)).toHaveLength(before.length);
  });
});

describe("security headers on API responses", () => {
  const expected = {
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "strict-transport-security": "max-age=63072000; includeSubDomains",
  };

  function expectSecurityHeaders(response: Response) {
    for (const [name, value] of Object.entries(expected)) {
      expect(response.headers.get(name)).toBe(value);
    }
    expect(response.headers.get("content-security-policy")).toContain(
      "frame-ancestors 'none'",
    );
  }

  it("T-03 an API response has the security headers", async () => {
    const { handler } = okRoute("GET");
    const success = await handler(apiRequest("/things", { as: "ana" }));
    const notSignedIn = await handler(apiRequest("/things"));
    const forbidden = await okRoute("POST").handler(
      apiRequest("/things", { method: "POST", origin: "https://evil.example" }),
    );

    expect(success.status).toBe(200);
    expect(notSignedIn.status).toBe(401);
    expect(forbidden.status).toBe(403);
    for (const response of [success, notSignedIn, forbidden]) {
      expectSecurityHeaders(response);
    }
  });

  it("T-03 a response with no content has the security headers", async () => {
    const handler = createRouteHandler(
      { method: "DELETE", path: "/things", handler: async () => {} },
      testDependencies({ db }),
    );
    const response = await handler(
      apiRequest("/things", { method: "DELETE", as: "ana" }),
    );
    expect(response.status).toBe(204);
    expectSecurityHeaders(response);
  });
});
