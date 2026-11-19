# T-03 API foundation and baseline security

**Issue:** [#29](https://github.com/ojordan0/AI4Devs-finalproject/issues/29) · **Ticket:** [docs/08-WORK-TICKETS.md, T-03](../../../docs/08-WORK-TICKETS.md#t-03-api-foundation-and-baseline-security) · **Branch:** `feat/t-03-api-foundation`

**Covers:** Epic E-08. Stories: US-26. Functional requirements: FR-39 (server side). Business rules: BR-12, BR-13, BR-32. Acceptance criteria: AC-97, and AC-95 as proposed below.

## Why

Every endpoint in [API §2](../../../docs/05-API.md#2-endpoints) needs the same handling first: checking the session, validating input against BR-32, checking group membership, limiting request rates, and answering in one error format. Building that once lets T-04, T-07, T-09, and T-11, the rest of D2's backend, add only business logic. T-07 and T-04 both depend on this ticket, and D2 is due on November 19, 2026.

## What Changes

- **Route handler structure** under `/api/v1`: a shared wrapper that every route handler uses. It reads the signed-in user, checks the request's origin, applies the rate limit, validates the body and query, calls the service, and turns the result or error into the format in [API §1](../../../docs/05-API.md#1-conventions). The messages are in the user's language.
- **Shared Zod schemas** in `src/shared/` for every field limit in BR-32, used by both the server and the interface (FR-39).
- **Membership check** in the domain services: given a user and a group, it returns the user's membership type, or the same "not available" error for a group that doesn't exist and a group the user isn't in (BR-12, BR-13).
- **Origin check:** a request that changes data and has no `Origin` header, or one that doesn't match `APP_URL`, is rejected ([Security and testing §1](../../../docs/07-SECURITY-AND-TESTING.md#1-security)).
- **Rate limiter:** counters per user, action, and time window in the `rate_limits` table. The "any API request" limit applies to every `/api/v1` request; T-08 and T-09 use the same limiter for their own actions. Over the limit, the response is `429 RATE_LIMITED` with a friendly message (AC-97).
- **Security headers** on every response: Content Security Policy, HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `frame-ancestors 'none'`.
- **OpenAPI generation:** a script builds `docs/openapi.yaml` from the Zod schemas. A new CI check fails when the committed file is out of date. At this point the file holds the conventions and shared components (session cookie, error format), with no paths yet.
- **Documents updated first**, because reviewing this ticket found three places where they can't be followed as written:
  - **AC-95 can't be tested in T-03.** The criterion and its example test ([Security and testing §2.7](../../../docs/07-SECURITY-AND-TESTING.md#27-example-test-cases)) are a browser test of item notes, and items have no endpoint until T-09 and no screen until T-10. AC-95 moves to T-10, which shows item notes. T-03 still delivers the headers that keep script from running (Content Security Policy and `nosniff`), tested here.
  - **Writing YAML needs a package.** zod-to-openapi produces an object, and no listed package writes YAML. `yaml` is added to [Architecture §1.6](../../../docs/03-ARCHITECTURE.md#16-dependencies) as a build package, used only by the generation script.
  - **Where the authorization guard lives.** [Architecture §2](../../../docs/03-ARCHITECTURE.md#2-project-structure) places it in `src/server/http`, but [§1.1](../../../docs/03-ARCHITECTURE.md#11-architecture-and-pattern) and `CLAUDE.md` put authorization in the domain services, so pages and the API apply the same check. The membership check goes in `src/server/services`, and §2 will describe `src/server/http` as the error format, request checks, and rate limiter.

## Capabilities

### New Capabilities

- `api-conventions`: how every `/api/v1` endpoint receives requests and answers: route structure, signed-in check, validation against BR-32, the error format and its language, and the generated OpenAPI document.
- `group-access`: deciding whether a user can reach a group's data and in which role (BR-12), and answering the same way for missing and inaccessible data (BR-13).
- `request-protection`: protections that apply to requests regardless of the endpoint: the origin check, rate limits, and security headers.

### Modified Capabilities

- `pull-request-checks`: pull requests also check that the generated OpenAPI document is up to date.

## Non-goals

| Left out | Owner |
| --- | --- |
| Better Auth configuration, the session cookie, and the development-only sign-in. T-03 defines how the wrapper gets the signed-in user; T-04 supplies it from Better Auth. | T-04 |
| The response for a signed-in user who hasn't finished onboarding ([API §1](../../../docs/05-API.md#1-conventions)) | T-04, which builds onboarding |
| Any endpoint in [API §2](../../../docs/05-API.md#2-endpoints) | T-04 onward |
| Finding which group owns a list, item, recipient, address, or shipment | The service of each resource, from T-07 |
| The per-action limits for link lookups, invitations, and items | T-08, T-09, and milestone 2 |
| Removing expired rate limit rows | The daily job, milestone 2 |
| Translation setup with next-intl, and interface screens for errors | T-05 |
| The AC-95 browser test | T-10 |

## Impact

- **New code:** the route handler wrapper, error format, origin check, and rate limiter in `src/server/http/`; the membership check in `src/server/services/`; field limits and Zod schemas in `src/shared/`; the security headers in the Next.js configuration and the request proxy (`src/proxy.ts`); the Zod extension the generator needs, in `src/server/http/zod-openapi.ts`; and the OpenAPI generation in `scripts/openapi-document.ts`, which builds the document, and `scripts/generate-openapi.ts`, the npm command that writes it.
- **New generated file:** `docs/openapi.yaml`.
- **Tables:** `rate_limits` (existing, written for the first time). `memberships` and `groups` (existing, read). No schema change, so no migration.
- **Endpoints:** none added. The base path `/api/v1` and its conventions are established.
- **Changed files:** `next.config.ts`, `src/app/layout.tsx` (pages render per request, so they carry the nonce), `eslint.config.mjs` (shared code can't import server code), `.prettierignore` (the generated file), `src/i18n/en.json` and `src/i18n/es.json` (error messages), `package.json` (the generation script and `yaml`), and `.github/workflows/ci.yml` (the OpenAPI check).
- **Changed documents:** `docs/03-ARCHITECTURE.md` (§1.6 and §2), `docs/05-API.md` (§1: a 500 `INTERNAL_ERROR` row for unexpected failures, and the `FORBIDDEN` row names the origin check), and `docs/08-WORK-TICKETS.md` (AC-95 moves from T-03 to T-10).
- **GitHub:** the new OpenAPI check is added to the required checks on `main`, which live in the `require-pull-request` repository ruleset. The descriptions of issues #29 and #36 list AC-95 under T-10.
- **New dependency:** `yaml`, a development dependency, once Architecture §1.6 lists it.
