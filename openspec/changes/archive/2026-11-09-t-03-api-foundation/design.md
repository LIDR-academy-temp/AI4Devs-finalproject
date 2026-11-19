# Design

## Context

- T-01 and T-02 left a Next.js 16 app with no route handlers, a Drizzle schema with every table (including `rate_limits`), a seed with two groups and every membership case, and the integration test setup that reseeds the test database per file.
- Better Auth is installed but not configured; T-04 configures it. next-intl is installed but not set up; T-05 sets it up. `src/i18n/en.json` and `es.json` exist.
- Layering ([Architecture §1.1](../../../docs/03-ARCHITECTURE.md#11-architecture-and-pattern)): route handlers authenticate, validate, and translate; services hold rules and authorization; pages and handlers never query the database.
- Integration tests call route handlers with real `Request` objects and no server ([Security and testing §2.1](../../../docs/07-SECURITY-AND-TESTING.md#21-test-levels)), so anything the API must do has to happen inside the handler, not in Next.js configuration that only a running server applies.
- See proposal.md for why, and the specs for the required behavior.

## Goals / Non-Goals

**Goals:**

- A later endpoint is one route file that declares its schemas, access, and service call, and gets the session check, origin check, rate limit, validation, error format, and OpenAPI entry without writing them again.
- Every piece can be tested with injected dependencies: database, clock, session reader, and `APP_URL`.

**Non-Goals:**

- No endpoint from [API §2](../../../docs/05-API.md#2-endpoints) is built. Tests use endpoints defined inside the test files with the same wrapper; nothing is added under `src/app/api/v1` that ships.
- No reading of the Better Auth session; T-04 plugs it in.

## Decisions

### 1. A route definition wrapper in `src/server/http`

Each handler is built with one function that takes a declaration: whether sign-in is required, the body, query, and path parameter schemas, the response schema, an optional per-action rate limit, and the handler body, which receives the parsed input and the request context (user, language, clock, database). The wrapper runs the steps in a fixed order:

1. Origin check for `POST`, `PATCH`, and `DELETE`.
2. Session: read the signed-in user; answer 401 when required and missing.
3. Rate limits: the general API limit, then the action's limit if declared.
4. Validation of path parameters, query, and body.
5. The handler body, which calls a service.
6. Mapping of the result or error into a response, with the security headers. The result is parsed with the response schema first, so only documented properties are sent.

The origin check runs first, so a cross-site request costs no database work, and the rate limit runs before validation, so invalid requests are counted too. The same declaration is registered with the OpenAPI registry, so the document can't drift from the handler.

*Alternatives:* Next.js middleware for the session and rate limit. Rejected: middleware doesn't run when integration tests call handlers directly, and it can't easily reach Postgres through `pg` at the edge. Separate helper calls in every handler. Rejected: easy to forget one step, and the order would vary.

### 2. Dependencies are injected, with production defaults

The wrapper takes a dependencies object: the database, a clock (a function returning the current time, as services require), a session reader, and the app origin from `APP_URL`. The exported default uses the real database client, the system clock, and the environment. Tests build handlers with their own dependencies.

The session reader is an interface: given the request headers, it returns the signed-in user (ID, language, and whether onboarding is finished) or nothing. T-03 ships a reader that always returns nothing, so no endpoint can be reached without sign-in until T-04 replaces it with one backed by Better Auth. Tests use a fake reader that returns a seed user.

### 3. Domain errors are thrown by services and mapped once

`src/server/services/errors.ts` defines one error class per code in [API §1](../../../docs/05-API.md#1-conventions) that a service can raise: not available, forbidden, already reserved, item changed, rule violation with its reason, and invitation invalid. Services throw them; the wrapper maps each to its status and code. Errors that aren't domain errors become `500 INTERNAL_ERROR` with a generic message, a code added to the table in [API §1](../../../docs/05-API.md#1-conventions), and are logged with their details on the server. The wrapper itself raises not signed in, validation failed, and rate limited.

### 4. The membership check lives in the services

`src/server/services/access.ts` resolves a user's active membership in a group (an `active` row in `memberships`) and returns its type, or throws not available. A second function requires the member type and throws forbidden for a buyer. A group ID that isn't a UUID is treated as not found before any query, so it gets the same 404 (BR-13). Services that own lists, items, and other resources find the owning group in their own query and then call this check; that lookup isn't built here.

*Alternative:* a guard in `src/server/http` that runs before the handler. Rejected: pages read data by calling services directly, so a guard in the API layer would leave pages unchecked ([Architecture §3](../../../docs/03-ARCHITECTURE.md#3-technical-decisions), "Where authorization lives").

### 5. Rate limit counters with one atomic upsert

The key combines the user ID, the action name, and the start of the current fixed window, computed from the injected clock. One statement inserts the row with a count of 1, or adds 1 to the existing row, and returns the new count: `INSERT … ON CONFLICT (key) DO UPDATE SET count = rate_limits.count + 1 RETURNING count`. `expires_at` is the end of the window, for the daily cleanup in milestone 2. The query lives with the data access code in `src/server/db`, so the limiter itself doesn't query the database.

The general limit uses the action `api` and the "any API request" limit from [Security and testing §1](../../../docs/07-SECURITY-AND-TESTING.md#1-security), kept with the other limits in one constants module. Requests without a signed-in user aren't counted; the only public endpoint, the invitation preview, belongs to T-08.

*Alternatives:* a sliding window. Rejected: more rows and queries for no benefit at this volume; a fixed window can let up to twice the limit through at a window boundary, which is acceptable for abuse protection. An in-memory counter. Rejected: Vercel runs several instances, and [Architecture §3](../../../docs/03-ARCHITECTURE.md#3-technical-decisions) stores rate limits in Postgres.

### 6. Shared field limits and schemas in `src/shared`

One module holds the BR-32 numbers, and another builds a Zod schema per field from them: names, notes, quantity, recipient details (count, name, value), link, agency, delivery address, and phone numbers. Phone numbers are parsed with libphonenumber-js and transformed to E.164, which the database check already requires. Recipient detail names and values need at least one character: BR-32 gives only their maximums, and an empty detail carries nothing. Validation failures are converted into `fields`, keyed by the field path, with a small set of codes the interface can turn into text: `required`, `too_short`, `too_long`, `too_small`, `too_big`, and `invalid`.

An ESLint rule stops files in `src/shared` from importing `src/server`, so the browser bundle never pulls in server code.

### 7. Error messages from the translation files, without next-intl's setup

The wrapper picks the language from the signed-in user's saved language, then from `Accept-Language`, then Spanish. It reads the message for the error code from the `errors` section of `src/i18n/en.json` or `es.json`, through next-intl's standalone translator, so the same keys work once T-05 sets up next-intl for pages. The rate limit message asks the user to try again shortly.

### 8. Security headers from one module, applied in three places

`src/server/http/security-headers.ts` defines the headers once:

- **Pages:** a request proxy (`src/proxy.ts`, Next.js 16's name for middleware) creates a nonce per request and sets the Content Security Policy with it, so Next.js marks its own scripts with the nonce. The root layout calls `connection()`, so every page renders per request: a page built once at build time would carry no nonce, and the policy would block its scripts. The policy is `default-src 'self'`, `script-src 'self' 'nonce-…' 'strict-dynamic'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data: blob:`, `connect-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, and `frame-ancestors 'none'`. Locally, `script-src` also allows `'unsafe-eval'`, which React needs in development.
- **Static headers** (HSTS, `nosniff`, and the referrer policy) for every route, in `next.config.ts`.
- **API responses:** the wrapper adds the static headers and a policy of `default-src 'none'; frame-ancestors 'none'`, because JSON needs nothing else. This is what lets integration tests check them. `next.config.ts` sets the same policy for `/api/:path*`, so answers Next.js produces itself, such as a 404 for an address with no route, carry it too.

`style-src` allows inline styles because Next.js and some Radix components set style attributes, which nonces don't cover. Script is what matters for AC-95, and inline script stays blocked. HSTS is `max-age=63072000; includeSubDomains`; browsers ignore it over plain `http` on localhost.

*Alternative:* a static policy with `'unsafe-inline'` scripts in `next.config.ts`. Rejected: it allows exactly the injected script the policy is meant to stop.

### 9. OpenAPI generation and its check

`scripts/openapi-document.ts` builds the document with zod-to-openapi, and `scripts/generate-openapi.ts` (`npm run openapi:generate`) writes it; tests call the first directly. The document comes from a registry in `src/server/http/openapi.ts`, which holds the base server, the `sessionCookie` scheme, and the `Error` schema as [API §3](../../../docs/05-API.md#3-openapi-definition-of-the-main-endpoints) defines them. Route files register their paths in the same registry, and the script imports every route module so each path is included. It writes `docs/openapi.yaml` with the `yaml` package, with keys in a fixed order so the output is repeatable.

With Zod 4, the generator can register a named schema, such as `Error`, only if Zod was extended before that schema was created. `src/server/http/zod-openapi.ts` does the extension, and modules that define registered schemas import it first.

A new CI job named `openapi` runs the script and `git diff --exit-code docs/openapi.yaml`. It is added to the required checks on `main`, in the `require-pull-request` repository ruleset. The generated file is listed in `.prettierignore`, so formatting never fights the generator.

*Alternative:* writing JSON into `openapi.yaml`, which is valid YAML, to avoid a package. Rejected: hard to read in review, and [API §3](../../../docs/05-API.md#3-openapi-definition-of-the-main-endpoints) shows the document as YAML.

### 10. A test helper that checks responses against their schema

`tests/support/` gets a helper that parses a response body with the endpoint's documented response schema and fails with the path of each mismatch. Endpoint tickets use it in every integration test.

## Risks / Trade-offs

- [A nonce-based policy makes every page render per request, not statically.] → The app is behind sign-in and shows fresh data on open anyway (PRD §15, Updates), so pages would be dynamic regardless.
- [A policy that is too strict breaks Next.js or a later component in ways only a browser shows.] → A browser test loads a page from a production build and fails on any policy violation in the console. Later tickets that add an image host, such as Vercel Blob in milestone 2, add it to `img-src` in the same module.
- [The placeholder session reader means endpoints added before T-04 can't be reached by real users.] → Intended: T-04 is the next ticket that adds an endpoint. Tests never depend on the placeholder.
- [A fixed window lets up to twice the limit through around a window boundary.] → Acceptable for abuse protection at this volume.
- [Rate limit rows accumulate until the daily cleanup exists in milestone 2.] → At most one row per user, action, and minute of use; small for the pilot.
- [A new required check must also be added to the `require-pull-request` ruleset, outside the repository.] → Done with `gh api` as part of the tasks, and confirmed on this ticket's pull request.

## Migration Plan

No schema change and no migration. Rollback is reverting the pull request; nothing outside the repository depends on it except the required `openapi` check, which is removed from the `require-pull-request` ruleset if the change is reverted.
