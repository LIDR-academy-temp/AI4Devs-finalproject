import "./zod-openapi";

import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  type RouteConfig,
} from "@asteasolutions/zod-to-openapi";

import { errorBodySchema } from "./errors";

// The OpenAPI document (docs/05-API.md, section 3) is generated from the same
// Zod schemas the endpoints validate with. Each route registers itself here.

export const SESSION_COOKIE = "__Secure-better-auth.session_token";

export function createOpenApiRegistry() {
  const registry = new OpenAPIRegistry();
  registry.registerComponent("securitySchemes", "sessionCookie", {
    type: "apiKey",
    in: "cookie",
    name: SESSION_COOKIE,
  });
  const error = registry.register("Error", errorBodySchema);
  return { registry, error };
}

const shared = createOpenApiRegistry();

/** The registry route modules add their paths to. */
export const openApiRegistry = shared.registry;

/** The registered Error schema, so responses refer to it by name. */
export const errorSchema = shared.error;

export function registerPath(config: RouteConfig) {
  openApiRegistry.registerPath(config);
}

export function generateOpenApiDocument(registry: OpenAPIRegistry) {
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: "3.1.0",
    info: { title: "ComproParaTi API", version: "1.0.0" },
    servers: [{ url: "/api/v1" }],
    security: [{ sessionCookie: [] }],
  });
}
