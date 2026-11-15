import type { ResponseConfig } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import { fieldErrors } from "../../shared/fields";
import { type RateLimit, rateLimits } from "../../shared/limits";
import { type Clock, systemClock } from "../clock";
import { type Database, db as defaultDb } from "../db/client";
import {
  type ErrorCode,
  errorStatus,
  RequestError,
  toErrorResult,
  ValidationFailedError,
} from "./errors";
import { requestLanguage } from "./language";
import { errorSchema, registerPath } from "./openapi";
import { enforceRateLimit } from "./rate-limit";
import { readSession } from "../auth";
import { apiSecurityHeaders } from "./security-headers";
import type { Language, SessionReader, SessionUser } from "./session";

// Every /api/v1 route handler is built with defineRoute, so each endpoint gets
// the same checks in the same order (design decision 1 of the T-03 change):
// origin, session, onboarding, rate limits, validation, then the handler, which
// calls a service. Results and errors leave in the format of docs/05-API.md,
// section 1, with the renewed session cookie when there is one (BR-03).

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

/** Requests with these methods change data, so they must come from the app itself. */
const CHANGING_METHODS: ReadonlySet<HttpMethod> = new Set([
  "POST",
  "PATCH",
  "DELETE",
]);

export type RouteDependencies = {
  db: Database;
  clock: Clock;
  readSession: SessionReader;
  /** The app's own address; changes from any other origin are refused. */
  appUrl: string | undefined;
};

export function defaultRouteDependencies(): RouteDependencies {
  return {
    db: defaultDb,
    clock: systemClock,
    readSession,
    appUrl: process.env.APP_URL,
  };
}

/**
 * "signed-in" requires a user who has completed onboarding; "before-onboarding"
 * any signed-in user; "public" no sign-in (docs/05-API.md, section 1).
 */
type Access = "signed-in" | "before-onboarding" | "public";

type Parsed<T> = T extends z.ZodType ? z.output<T> : undefined;

export type RouteContext<A extends Access> = {
  user: A extends "public" ? SessionUser | null : SessionUser;
  language: Language;
  db: Database;
  clock: Clock;
  request: Request;
  /** The app's own address, for links the response includes. */
  appUrl: string | undefined;
};

export type RouteDefinition<
  A extends Access,
  P extends z.ZodType | undefined,
  Q extends z.ZodType | undefined,
  B extends z.ZodType | undefined,
  R extends z.ZodType | undefined,
> = {
  method: HttpMethod;
  /** The OpenAPI path under /api/v1, for example /groups/{groupId}. */
  path: string;
  summary?: string;
  /**
   * Defaults to "signed-in". `GET /me` and `POST /me/onboarding` work before
   * onboarding, and only the invitation preview is public (docs/05-API.md, section 1).
   */
  access?: A;
  /** Path parameters. A value that fails them answers 404, like a missing resource (BR-13). */
  params?: P;
  query?: Q;
  body?: B;
  /** The success body's schema. Without one, the success response is 204. */
  response?: R;
  successStatus?: 200 | 201;
  /** A per-action limit, counted on top of the limit for any request. */
  rateLimit?: RateLimit;
  /** Codes the endpoint's service can refuse with, for the OpenAPI document. */
  errors?: readonly ErrorCode[];
  handler: (
    input: { params: Parsed<P>; query: Parsed<Q>; body: Parsed<B> },
    context: RouteContext<A>,
  ) => Promise<R extends z.ZodType ? z.input<R> : void>;
};

type NextRouteContext = { params?: Promise<Record<string, string | string[]>> };

export type RouteHandler = (
  request: Request,
  context?: NextRouteContext,
) => Promise<Response>;

function isSameOrigin(request: Request, appUrl: string | undefined): boolean {
  const origin = request.headers.get("origin");
  if (!origin || !appUrl) return false;
  try {
    return origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}

/** Every signed-in endpoint needs a completed onboarding unless it says otherwise. */
function requiresOnboarding(access: Access | undefined): boolean {
  return access === undefined || access === "signed-in";
}

function validate<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationFailedError(fieldErrors(result.error, input));
  }
  return result.data;
}

async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.trim() === "") return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new ValidationFailedError({ body: "invalid" });
  }
}

function withHeaders(extra: Headers): Headers {
  const headers = new Headers(apiSecurityHeaders);
  for (const cookie of extra.getSetCookie())
    headers.append("set-cookie", cookie);
  return headers;
}

function json(body: unknown, status: number, extra: Headers): Response {
  return Response.json(body, { status, headers: withHeaders(extra) });
}

/** Builds the route handler with the given dependencies; tests pass their own. */
export function createRouteHandler<
  A extends Access = "signed-in",
  P extends z.ZodType | undefined = undefined,
  Q extends z.ZodType | undefined = undefined,
  B extends z.ZodType | undefined = undefined,
  R extends z.ZodType | undefined = undefined,
>(
  definition: RouteDefinition<A, P, Q, B, R>,
  dependencies: RouteDependencies = defaultRouteDependencies(),
): RouteHandler {
  const { db, clock, readSession, appUrl } = dependencies;

  return async (request, nextContext) => {
    let language = requestLanguage(null, request.headers);
    // Cookies the session reader sets when it renews the session.
    const sessionHeaders = new Headers();
    try {
      if (
        CHANGING_METHODS.has(definition.method) &&
        !isSameOrigin(request, appUrl)
      ) {
        throw new RequestError("FORBIDDEN");
      }

      const user = await readSession(request.headers, sessionHeaders);
      language = requestLanguage(user, request.headers);
      if (definition.access !== "public" && !user) {
        throw new RequestError("NOT_SIGNED_IN");
      }
      if (requiresOnboarding(definition.access) && !user?.onboarded) {
        throw new RequestError("FORBIDDEN");
      }

      if (user) {
        await enforceRateLimit(db, clock, user.id, rateLimits.anyRequest);
        if (definition.rateLimit) {
          await enforceRateLimit(db, clock, user.id, definition.rateLimit);
        }
      }

      let params: unknown = undefined;
      if (definition.params) {
        const result = definition.params.safeParse(
          (await nextContext?.params) ?? {},
        );
        if (!result.success) throw new RequestError("NOT_AVAILABLE");
        params = result.data;
      }

      const query = definition.query
        ? validate(
            definition.query,
            Object.fromEntries(new URL(request.url).searchParams),
          )
        : undefined;

      const body = definition.body
        ? validate(definition.body, await readJsonBody(request))
        : undefined;

      const result = await definition.handler(
        { params, query, body } as Parameters<typeof definition.handler>[0],
        { user, language, db, clock, request, appUrl } as RouteContext<A>,
      );

      if (!definition.response) {
        return new Response(null, {
          status: 204,
          headers: withHeaders(sessionHeaders),
        });
      }
      // Only what the response schema documents leaves the server: unknown
      // properties, such as extra columns from a query, are stripped, and a
      // result that doesn't match becomes a 500 instead of a leak.
      return json(
        definition.response.parse(result),
        definition.successStatus ?? 200,
        sessionHeaders,
      );
    } catch (error) {
      const { status, body } = toErrorResult(error, language);
      return json(body, status, sessionHeaders);
    }
  };
}

function errorResponses(codes: readonly ErrorCode[]) {
  const byStatus = new Map<number, ErrorCode[]>();
  for (const code of new Set(codes)) {
    const status = errorStatus[code];
    byStatus.set(status, [...(byStatus.get(status) ?? []), code]);
  }
  const responses: Record<number, ResponseConfig> = {};
  for (const [status, statusCodes] of byStatus) {
    responses[status] = {
      description: statusCodes.join(" or "),
      content: { "application/json": { schema: errorSchema } },
    };
  }
  return responses;
}

/** The errors every route can answer with, from its declaration. */
export function routeErrorCodes(definition: {
  method: HttpMethod;
  access?: Access;
  params?: unknown;
  query?: unknown;
  body?: unknown;
  errors?: readonly ErrorCode[];
}): ErrorCode[] {
  const signedIn = definition.access !== "public";
  return [
    ...(CHANGING_METHODS.has(definition.method) ||
    requiresOnboarding(definition.access)
      ? (["FORBIDDEN"] as const)
      : []),
    ...(signedIn ? (["NOT_SIGNED_IN", "RATE_LIMITED"] as const) : []),
    ...(definition.params ? (["NOT_AVAILABLE"] as const) : []),
    ...(definition.query || definition.body
      ? (["VALIDATION_FAILED"] as const)
      : []),
    ...(definition.errors ?? []),
    "INTERNAL_ERROR",
  ];
}

/**
 * Declares a route without building its handler. Next.js lets a route.ts file
 * export only its method handlers, so each resource folder keeps its
 * declarations in a separate file: route.ts passes them to defineRoute, and
 * tests to createRouteHandler with their own dependencies. The type
 * parameters check the handler against the declared schemas.
 */
export function routeDefinition<
  A extends Access = "signed-in",
  P extends z.ZodType | undefined = undefined,
  Q extends z.ZodType | undefined = undefined,
  B extends z.ZodType | undefined = undefined,
  R extends z.ZodType | undefined = undefined,
>(definition: RouteDefinition<A, P, Q, B, R>): RouteDefinition<A, P, Q, B, R> {
  return definition;
}

/**
 * Declares an /api/v1 route: registers it in the OpenAPI document and returns
 * the Next.js route handler, for example `export const GET = defineRoute({...})`.
 */
export function defineRoute<
  A extends Access = "signed-in",
  P extends z.ZodType | undefined = undefined,
  Q extends z.ZodType | undefined = undefined,
  B extends z.ZodType | undefined = undefined,
  R extends z.ZodType | undefined = undefined,
>(definition: RouteDefinition<A, P, Q, B, R>): RouteHandler {
  const status = definition.successStatus ?? 200;
  registerPath({
    method: definition.method.toLowerCase() as Lowercase<HttpMethod>,
    path: definition.path,
    summary: definition.summary,
    ...(definition.access === "public" ? { security: [] } : {}),
    request: {
      ...(definition.params ? { params: definition.params as never } : {}),
      ...(definition.query ? { query: definition.query as never } : {}),
      ...(definition.body
        ? {
            body: {
              content: { "application/json": { schema: definition.body } },
            },
          }
        : {}),
    },
    responses: {
      ...(definition.response
        ? {
            [status]: {
              description: "Success",
              content: { "application/json": { schema: definition.response } },
            },
          }
        : { 204: { description: "Success, with no content" } }),
      ...errorResponses(routeErrorCodes(definition)),
    },
  });
  return createRouteHandler(definition);
}
