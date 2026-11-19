import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  generateOpenApiDocument,
  openApiRegistry,
} from "../../src/server/http/openapi";
import { defineRoute } from "../../src/server/http/route";

// A route declared with defineRoute appears in the OpenAPI document with the
// same schemas it validates with, and with every error it can answer.

const itemSchema = z.object({ id: z.uuid(), name: z.string() });

defineRoute({
  method: "POST",
  path: "/lists/{listId}/test-items",
  summary: "Create a test item",
  params: z.object({ listId: z.string() }),
  body: z.object({ name: z.string().min(1).max(100) }),
  response: itemSchema,
  successStatus: 201,
  errors: ["RULE_VIOLATION"],
  handler: async () => ({ id: crypto.randomUUID(), name: "x" }),
});

defineRoute({
  method: "GET",
  path: "/test-preview",
  access: "public",
  response: z.object({ ok: z.boolean() }),
  handler: async () => ({ ok: true }),
});

// Read as plain JSON: the generator's types allow references everywhere.
const document = JSON.parse(
  JSON.stringify(generateOpenApiDocument(openApiRegistry)),
);

describe("defineRoute", () => {
  it("T-03 a route is documented with its request, response, and errors", () => {
    const operation = document.paths["/lists/{listId}/test-items"].post;

    expect(operation.summary).toBe("Create a test item");
    expect(operation.parameters).toEqual([
      expect.objectContaining({ name: "listId", in: "path", required: true }),
    ]);
    expect(
      operation.requestBody.content["application/json"].schema,
    ).toMatchObject({
      properties: { name: { type: "string", minLength: 1, maxLength: 100 } },
    });
    expect(Object.keys(operation.responses).sort()).toEqual(
      ["201", "401", "403", "404", "409", "422", "429", "500"].sort(),
    );
    expect(
      operation.responses["409"].content["application/json"].schema,
    ).toEqual({
      $ref: "#/components/schemas/Error",
    });
    expect(operation.responses["403"].description).toBe("FORBIDDEN");
    expect(operation.responses["429"].description).toBe("RATE_LIMITED");
  });

  it("T-03 a public route needs no session and can't be rate limited per user", () => {
    const operation = document.paths["/test-preview"].get;

    expect(operation.security).toEqual([]);
    expect(Object.keys(operation.responses).sort()).toEqual(["200", "500"]);
  });
});
