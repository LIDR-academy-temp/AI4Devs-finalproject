import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { seedIds } from "../../scripts/seed-data";
import en from "../../src/i18n/en.json";
import es from "../../src/i18n/es.json";
import { errorBodySchema } from "../../src/server/http/errors";
import { createRouteHandler } from "../../src/server/http/route";
import { resolveGroupAccess } from "../../src/server/services/access";
import {
  AlreadyReservedError,
  type DomainError,
  ForbiddenError,
  InvitationInvalidError,
  ItemChangedError,
  NotAvailableError,
  RuleViolationError,
} from "../../src/server/services/errors";
import { fields } from "../../src/shared/fields";
import {
  apiRequest,
  createTestDatabase,
  expectMatchesSchema,
  routeParams,
  testDependencies,
} from "../support/routes";

// Verifies the conventions in docs/05-API.md, section 1, through endpoints
// defined here with the same wrapper as the real ones.

const { pool, db } = createTestDatabase();
afterAll(() => pool.end());
const dependencies = testDependencies({ db });

async function errorOf(response: Response) {
  const body = await response.json();
  expectMatchesSchema(errorBodySchema, body);
  return body.error as {
    code: string;
    message: string;
    reason?: string;
    fields?: Record<string, string>;
  };
}

describe("schema check helper", () => {
  it("T-03 a response that breaks its schema fails the test", () => {
    const schema = z.object({ id: z.number(), name: z.string() });
    // The body leaves out `name`, which the schema requires.
    expect(() => expectMatchesSchema(schema, { id: 1 })).toThrow(/name/);
    expect(() =>
      expectMatchesSchema(schema, { id: 1, name: "x" }),
    ).not.toThrow();
  });
});

describe("response schema", () => {
  const schema = z.object({ id: z.number(), name: z.string() });

  it("T-03 only properties the response schema documents are sent", async () => {
    const handler = createRouteHandler(
      {
        method: "GET",
        path: "/person",
        response: schema,
        // A service that returns a whole row, with a column the response doesn't document.
        handler: async () => {
          const row = { id: 1, name: "Ana", whatsappNumber: "+12025550101" };
          return row;
        },
      },
      dependencies,
    );

    const response = await handler(apiRequest("/person", { as: "ana" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: 1, name: "Ana" });
  });

  it("T-03 a result that breaks the response schema becomes a 500", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = createRouteHandler(
      {
        method: "GET",
        path: "/broken",
        response: schema,
        handler: async () => ({ id: 1 }) as z.input<typeof schema>,
      },
      dependencies,
    );

    const response = await handler(apiRequest("/broken", { as: "ana" }));

    expect(response.status).toBe(500);
    expect((await errorOf(response)).code).toBe("INTERNAL_ERROR");
    log.mockRestore();
  });
});

describe("signed-in check", () => {
  it("T-03 request without a session is rejected", async () => {
    const service = vi.fn(async () => ({ ok: true }));
    const handler = createRouteHandler(
      {
        method: "GET",
        path: "/private",
        response: z.object({ ok: z.boolean() }),
        handler: service,
      },
      dependencies,
    );

    const response = await handler(apiRequest("/private"));

    expect(response.status).toBe(401);
    expect((await errorOf(response)).code).toBe("NOT_SIGNED_IN");
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(service).not.toHaveBeenCalled();
  });

  it("T-03 public endpoint skips the session check", async () => {
    const service = vi.fn(async () => ({ ok: true }));
    const handler = createRouteHandler(
      {
        method: "GET",
        path: "/public",
        access: "public",
        response: z.object({ ok: z.boolean() }),
        handler: service,
      },
      dependencies,
    );

    const response = await handler(apiRequest("/public"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(service).toHaveBeenCalledOnce();
  });

  it("T-03 a signed-in request reaches the handler with its user", async () => {
    const handler = createRouteHandler(
      {
        method: "GET",
        path: "/me-ish",
        response: z.object({ id: z.string() }),
        handler: async (_input, { user }) => ({ id: user.id }),
      },
      dependencies,
    );
    const response = await handler(apiRequest("/me-ish", { as: "ana" }));
    expect(await response.json()).toEqual({ id: seedIds.users.ana });
  });
});

describe("error format", () => {
  function failingHandler(error: unknown) {
    return createRouteHandler(
      {
        method: "GET",
        path: "/fails",
        response: z.object({}),
        handler: async () => {
          throw error;
        },
      },
      dependencies,
    );
  }

  const domainErrors: [DomainError, number, string][] = [
    [new ForbiddenError(), 403, "FORBIDDEN"],
    [new NotAvailableError(), 404, "NOT_AVAILABLE"],
    [new AlreadyReservedError(), 409, "ALREADY_RESERVED"],
    [new ItemChangedError(), 409, "ITEM_CHANGED"],
    [new RuleViolationError("LIST_NOT_DELETABLE"), 409, "RULE_VIOLATION"],
    [new InvitationInvalidError(), 410, "INVITATION_INVALID"],
  ];

  it.each(domainErrors)(
    "T-03 domain error becomes its status and code: %o",
    async (error, status, code) => {
      const response = await failingHandler(error)(
        apiRequest("/fails", { as: "ana" }),
      );
      const body = await errorOf(response);

      expect(response.status).toBe(status);
      expect(body.code).toBe(code);
      expect(body.message).toBe(en.errors[code as keyof typeof en.errors]);
      if (code === "RULE_VIOLATION") {
        expect(body.reason).toBe("LIST_NOT_DELETABLE");
      } else {
        expect(body).not.toHaveProperty("reason");
      }
    },
  );

  it("T-03 unexpected failure reveals nothing", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error('relation "secret_table" does not exist');

    const response = await failingHandler(failure)(
      apiRequest("/fails", { as: "ana" }),
    );
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(text)).toEqual({
      error: { code: "INTERNAL_ERROR", message: en.errors.INTERNAL_ERROR },
    });
    expect(text).not.toContain("secret_table");
    expect(text).not.toContain(failure.stack!.split("\n")[1].trim());
    expect(log).toHaveBeenCalledWith(failure);
    log.mockRestore();
  });
});

describe("error language", () => {
  const forbidden = createRouteHandler(
    {
      method: "GET",
      path: "/forbidden",
      response: z.object({}),
      handler: async () => {
        throw new ForbiddenError();
      },
    },
    dependencies,
  );
  const signedIn = createRouteHandler(
    {
      method: "GET",
      path: "/private",
      response: z.object({}),
      handler: async () => ({}),
    },
    dependencies,
  );

  it("T-03 message follows the user's language", async () => {
    const english = await errorOf(
      await forbidden(apiRequest("/forbidden", { as: "ana" })),
    );
    const spanish = await errorOf(
      await forbidden(apiRequest("/forbidden", { as: "rosa" })),
    );

    expect(english.message).toBe(en.errors.FORBIDDEN);
    expect(spanish.message).toBe(es.errors.FORBIDDEN);
  });

  it("T-03 the user's language wins over the browser's", async () => {
    const body = await errorOf(
      await forbidden(
        apiRequest("/forbidden", {
          as: "rosa",
          headers: { "accept-language": "en-US" },
        }),
      ),
    );
    expect(body.message).toBe(es.errors.FORBIDDEN);
  });

  it.each([
    ["en-US,en;q=0.9", en.errors.NOT_SIGNED_IN],
    ["fr-FR, en;q=0.5", en.errors.NOT_SIGNED_IN],
    ["en;q=0.4, es-MX;q=0.8", es.errors.NOT_SIGNED_IN],
    ["fr-FR, de", es.errors.NOT_SIGNED_IN],
    [undefined, es.errors.NOT_SIGNED_IN],
  ])(
    "T-03 message follows the browser without a user (Accept-Language %s)",
    async (acceptLanguage, message) => {
      const headers: Record<string, string> = acceptLanguage
        ? { "accept-language": acceptLanguage }
        : {};
      const body = await errorOf(
        await signedIn(apiRequest("/private", { headers })),
      );
      expect(body.message).toBe(message);
    },
  );
});

describe("validation", () => {
  const createSchema = z.object({
    name: fields.name,
    quantity: fields.quantity,
  });

  function createHandler(service = vi.fn(async () => ({ ok: true }))) {
    return {
      service,
      handler: createRouteHandler(
        {
          method: "POST",
          path: "/things",
          body: createSchema,
          response: z.object({ ok: z.boolean() }),
          successStatus: 201,
          handler: service,
        },
        dependencies,
      ),
    };
  }

  it("T-03 invalid body answers with the failing fields", async () => {
    const { service, handler } = createHandler();

    const response = await handler(
      apiRequest("/things", {
        method: "POST",
        as: "ana",
        body: { quantity: 500 },
      }),
    );
    const body = await errorOf(response);

    expect(response.status).toBe(422);
    expect(body).toEqual({
      code: "VALIDATION_FAILED",
      message: en.errors.VALIDATION_FAILED,
      fields: { name: "required", quantity: "too_big" },
    });
    expect(service).not.toHaveBeenCalled();
  });

  it("T-03 body that isn't JSON is rejected", async () => {
    const { service, handler } = createHandler();

    const response = await handler(
      apiRequest("/things", {
        method: "POST",
        as: "ana",
        rawBody: "{ not json",
      }),
    );

    expect(response.status).toBe(422);
    expect((await errorOf(response)).fields).toEqual({ body: "invalid" });
    expect(service).not.toHaveBeenCalled();
  });

  it("T-03 a valid body reaches the service, parsed", async () => {
    const { service, handler } = createHandler();

    const response = await handler(
      apiRequest("/things", {
        method: "POST",
        as: "ana",
        body: { name: "  Shoes ", quantity: 2 },
      }),
    );

    expect(response.status).toBe(201);
    expect(service).toHaveBeenCalledWith(
      expect.objectContaining({ body: { name: "Shoes", quantity: 2 } }),
      expect.anything(),
    );
  });

  it("T-03 invalid query parameters answer with the failing fields", async () => {
    const handler = createRouteHandler(
      {
        method: "GET",
        path: "/things",
        query: z.object({ status: z.enum(["pending", "reserved"]).optional() }),
        response: z.object({}),
        handler: async () => ({}),
      },
      dependencies,
    );
    const response = await handler(
      apiRequest("/things?status=lost", { as: "ana" }),
    );
    expect(response.status).toBe(422);
    expect((await errorOf(response)).fields).toEqual({ status: "invalid" });
  });
});

describe("group access through an endpoint", () => {
  const groupHandler = createRouteHandler(
    {
      method: "GET",
      path: "/groups/{groupId}",
      params: z.object({ groupId: z.string() }),
      response: z.object({ type: z.string() }),
      handler: async ({ params }, { db, user }) => {
        const access = await resolveGroupAccess(db, user.id, params.groupId);
        return { type: access.type };
      },
    },
    dependencies,
  );

  async function snapshot(groupId: string) {
    const response = await groupHandler(
      apiRequest(`/groups/${groupId}`, { as: "ana" }),
      routeParams({ groupId }),
    );
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: await response.text(),
    };
  }

  it("T-03 a member reaches their own group", async () => {
    const result = await snapshot(seedIds.groups.garcia);
    expect(result.status).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ type: "member" });
  });

  it("BR-13 another group's data gets the same 404 as missing data", async () => {
    const otherGroup = await snapshot(seedIds.groups.perez);
    const missing = await snapshot(randomUUID());

    expect(otherGroup.status).toBe(404);
    expect(JSON.parse(otherGroup.body).error.code).toBe("NOT_AVAILABLE");
    expect(missing).toEqual(otherGroup);
  });

  it("BR-13 a malformed ID gets the same 404", async () => {
    expect(await snapshot("not-a-uuid")).toEqual(
      await snapshot(seedIds.groups.perez),
    );
  });

  it("BR-13 path parameters that fail their schema get the same 404", async () => {
    const strict = createRouteHandler(
      {
        method: "GET",
        path: "/groups/{groupId}",
        params: z.object({ groupId: z.uuid() }),
        response: z.object({}),
        handler: async () => ({}),
      },
      dependencies,
    );
    const response = await strict(
      apiRequest("/groups/nope", { as: "ana" }),
      routeParams({ groupId: "nope" }),
    );
    expect(response.status).toBe(404);
    expect((await errorOf(response)).code).toBe("NOT_AVAILABLE");
  });
});
