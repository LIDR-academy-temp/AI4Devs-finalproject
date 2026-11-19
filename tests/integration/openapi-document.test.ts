import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { buildOpenApiYaml, OPENAPI_PATH } from "../../scripts/openapi-document";

// Verifies the generated document against docs/05-API.md, section 3.

describe("generated OpenAPI document", () => {
  it("T-03 generated document has the shared components", async () => {
    const document = parse(await buildOpenApiYaml());

    expect(document.openapi).toBe("3.1.0");
    expect(document.info).toEqual({
      title: "ComproParaTi API",
      version: "1.0.0",
    });
    expect(document.servers).toEqual([{ url: "/api/v1" }]);
    expect(document.security).toEqual([{ sessionCookie: [] }]);
    expect(document.components.securitySchemes.sessionCookie).toEqual({
      type: "apiKey",
      in: "cookie",
      name: "__Secure-better-auth.session_token",
    });

    const error = document.components.schemas.Error;
    expect(error.required).toEqual(["error"]);
    expect(error.properties.error.required).toEqual(["code", "message"]);
    expect(Object.keys(error.properties.error.properties)).toEqual([
      "code",
      "message",
      "reason",
      "fields",
    ]);
    expect(error.properties.error.properties.fields).toEqual({
      type: "object",
      additionalProperties: { type: "string" },
    });
  });

  it("T-03 generation is repeatable", async () => {
    expect(await buildOpenApiYaml()).toBe(await buildOpenApiYaml());
  });

  it("T-03 the committed document is up to date", async () => {
    expect(readFileSync(OPENAPI_PATH, "utf8")).toBe(await buildOpenApiYaml());
  });
});
