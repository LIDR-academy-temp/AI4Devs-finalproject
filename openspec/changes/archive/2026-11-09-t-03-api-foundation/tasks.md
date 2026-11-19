# Tasks

T-03 keeps one acceptance criterion with an ID, AC-97, whose test is task 5.4. AC-95 moves to T-10 (task 1.3). The other scenarios are named after the rule they verify (`BR-12`, `BR-13`, `BR-32`) or after the ticket (`T-03`), as [Security and testing §2.6](../../../docs/07-SECURITY-AND-TESTING.md#26-coverage-targets) describes. Of the definition of done, all three items in scope apply: lint and type checks with an up-to-date OpenAPI document (group 6), interface text in both languages for the error messages (task 4.3), and the owning documents (group 1).

## 1. Documents and dependency first

- [x] 1.1 Add `yaml` to the build packages in `docs/03-ARCHITECTURE.md` §1.6, used by the OpenAPI generation script, and install it as a development dependency. Verify that `package.json` and `package-lock.json` list it, and that `npm run lint` and `npx tsc --noEmit` pass.
- [x] 1.2 Update `docs/03-ARCHITECTURE.md` §2: describe `src/server/http` as the error format, request checks, and rate limiter, and `src/server/services` as including the membership check (design decision 4). Update the header's version and date. Verify that §1.1, §2, and §3 ("Where authorization lives") agree.
- [x] 1.3 Move AC-95 from T-03 to T-10 in `docs/08-WORK-TICKETS.md`, and update the header. Update the descriptions of issues #29 and #36 to match, with `gh issue edit`. Verify that each issue's acceptance criteria row matches its ticket.
- [x] 1.4 Verify the documents with `npm run check:links`, and that no rule text is copied from the PRD into the changed sections.

## 2. Shared field limits and schemas

- [x] 2.1 Add the BR-32 limits and the rate limits from Security and testing §1 as constants in `src/shared/` (design decisions 5 and 6). Verify with `npx tsc --noEmit`.
- [x] 2.2 Add a Zod schema per BR-32 field in `src/shared/`, with phone numbers parsed by libphonenumber-js and transformed to E.164, and the conversion of validation failures into `fields` codes (design decision 6). Recipient detail names and values need at least one character. Verify with `npx tsc --noEmit`.
- [x] 2.3 Test the scenario "BR-32 each field limit is enforced" in `tests/unit/`, with one test per field named with `BR-32`, each checking the value at the limit and just past it. Verify that the tests pass, and that changing one limit constant makes its test fail.
- [x] 2.4 Test the scenarios "BR-32 phone numbers must be valid international numbers" and "BR-32 links must be http or https". Verify that the tests pass, including a number given with spaces that is stored in E.164.
- [x] 2.5 Add an ESLint rule that stops files in `src/shared` from importing `src/server` (scenario "T-03 shared schemas have no server imports"). Verify that `npm run lint` passes, and fails after temporarily adding such an import, then remove it.

## 3. Domain errors and the membership check

- [x] 3.1 Add the domain error classes to `src/server/services/errors.ts`, one per code a service can raise in API §1 (design decision 3). Verify with `npx tsc --noEmit`.
- [x] 3.2 Add the clock type the services and the rate limiter receive, and the membership check in `src/server/services/access.ts`: resolve the active membership and its type, and require the member type, reading `memberships` (design decision 4). Verify with `npx tsc --noEmit`.
- [x] 3.3 Test the `group-access` scenarios "BR-12 a member's access resolves as member", "BR-12 a buyer's access resolves as buyer", "BR-12 an ended membership gives no access", "BR-12 a buyer is refused a member-only action", and "BR-12 a member passes a member-only check" in `tests/integration/`, against the seed (Ana, Juan, and Pedro in the García Group). Verify that the tests pass.
- [x] 3.4 Test that a group ID that doesn't exist, a group the user isn't in (the Pérez Group for Ana), and an ID that isn't a UUID all throw the same not-available error. Verify that the tests pass.

## 4. Route handler wrapper and error format

- [x] 4.1 Add the session reader interface, the placeholder reader that returns no user, and a fake reader for tests in `tests/support/` (design decision 2). Verify with `npx tsc --noEmit`.
- [x] 4.2 Add the route definition wrapper in `src/server/http/`, with injected dependencies, the step order in design decision 1, validation of path parameters, query, and body, and the mapping of domain errors and unexpected errors into the error format (design decision 3). Verify with `npx tsc --noEmit`.
- [x] 4.3 Add the `errors` messages for every code in API §1, plus the generic 500 message, to `src/i18n/en.json` and `src/i18n/es.json`, and the language choice in design decision 7. Add `tests/unit/translations.test.ts`, checking that both files have the same keys and no empty message, since no such check existed. Verify that it passes.
- [x] 4.4 Add the response schema helper in `tests/support/` (design decision 10), and test the scenario "T-03 a response that breaks its schema fails the test". Verify that the test passes.
- [x] 4.5 Test the `api-conventions` scenarios "T-03 request without a session is rejected" and "T-03 public endpoint skips the session check" in `tests/integration/`, with endpoints defined in the test file using the wrapper. Verify that the tests pass and that a spy shows the service wasn't called on rejection.
- [x] 4.6 Test the scenarios "T-03 domain error becomes its status and code" and "T-03 unexpected failure reveals nothing", covering every row of the API §1 table. Verify that the tests pass, and that the 500 body has no stack trace or database text.
- [x] 4.7 Test the scenarios "T-03 message follows the user's language" and "T-03 message follows the browser without a user". Verify that the tests pass for English, Spanish, and an unsupported browser language.
- [x] 4.8 Test the scenarios "T-03 invalid body answers with the failing fields" and "T-03 body that isn't JSON is rejected". Verify that the tests pass and that the service isn't called.
- [x] 4.9 Test the `group-access` scenarios "BR-13 another group's data gets the same 404 as missing data" and "BR-13 a malformed ID gets the same 404" through a test endpoint that calls the membership check. Verify that the two 404 responses have identical status, headers, and bodies.
- [x] 4.10 Add the 500 `INTERNAL_ERROR` row to the error table in `docs/05-API.md` §1, name the origin check in its `FORBIDDEN` row, and update the header. Verify with `npm run check:links`.
- [x] 4.11 Parse each success result with the route's response schema, so only documented properties are sent and a mismatch becomes a 500 (adversarial review, finding 1). Test the scenarios "T-03 only properties the response schema documents are sent" and "T-03 a result that breaks the response schema becomes a 500". Verify that the tests pass.

## 5. Origin check, rate limits, and security headers

- [x] 5.1 Add the origin check to the wrapper (spec requirement "Changes only from the app's own origin"). Test the scenarios "T-03 change from another origin is rejected", "T-03 change with no origin is rejected", and "T-03 change from the app's own origin passes" in `tests/integration/`. Verify that the tests pass.
- [x] 5.2 Add the rate limit counter query to `src/server/db/` and the limiter in `src/server/http/`, using the clock it receives and the upsert in design decision 5, writing `rate_limits`. Verify with `npx tsc --noEmit`.
- [x] 5.3 Apply the general limit in the wrapper, and the optional per-action limit from a route declaration. Verify with `npx tsc --noEmit`.
- [x] 5.4 Write the test `AC-97 request over the rate limit is rejected with a friendly message` in `tests/integration/`, with a controlled clock. Verify that it passes, and that the message is the translation-file text in the user's language.
- [x] 5.5 Test the scenarios "T-03 requests under the limit pass", "T-03 the limit resets in the next window", "T-03 each user has their own count", "T-03 simultaneous requests are all counted" (on separate database connections), and "T-03 an action limit is counted separately". Verify that the tests pass, and that the `rate_limits` rows have the expected keys, counts, and `expires_at`.
- [x] 5.6 Add `src/server/http/security-headers.ts`, the request proxy in `src/proxy.ts` with the per-request nonce policy, the static headers in `next.config.ts`, the API headers in the wrapper, and a `connection()` call in `src/app/layout.tsx` so pages render per request (design decision 8). Verify that `npm run build` succeeds.
- [x] 5.7 Test the scenario "T-03 an API response has the security headers" in `tests/integration/`, for a success and an error response. Verify that the test passes.
- [x] 5.8 Test the scenario "T-03 a page has the security headers" in `tests/e2e/`, against the production build, failing on any policy violation in the console. Verify that `npm run test:e2e` passes in Chromium and WebKit.
- [x] 5.9 Test the scenario "T-03 inline script added to the page doesn't run" in `tests/e2e/`, with a control that turns the policy off, and remove the assertion that could never fail (adversarial review, finding 2). Verify that it passes in Chromium and WebKit.
- [x] 5.10 Set the API policy for `/api/:path*` in `next.config.ts`, and test that an address with no route gets it (adversarial review, finding 3). Verify with `npm run test:e2e`.
- [x] 5.11 Assert in the test "T-03 an action limit is counted separately" that the limit for any request also counts requests on the action-limited route (adversarial review, finding 9). Verify that the test passes.

## 6. OpenAPI document and its check

- [x] 6.1 Add the OpenAPI registry in `src/server/http/openapi.ts` with the server, the `sessionCookie` scheme, and the `Error` schema from API §3, and have the wrapper register each route's declaration (design decision 9). Verify with `npx tsc --noEmit`.
- [x] 6.2 Add `scripts/openapi-document.ts`, which builds the document, `scripts/generate-openapi.ts` and the `openapi:generate` npm script, which write `docs/openapi.yaml` with `yaml`, and `src/server/http/zod-openapi.ts` (design decision 9), and list the file in `.prettierignore`. Generate and commit `docs/openapi.yaml`. Verify that `npm run lint` passes.
- [x] 6.3 Test the scenarios "T-03 generated document has the shared components" and "T-03 generation is repeatable" in `tests/integration/`. Verify that the tests pass.
- [x] 6.4 Add the `openapi` job to `.github/workflows/ci.yml`, running the script and `git diff --exit-code docs/openapi.yaml`. Verify locally that the commands pass, and fail after temporarily changing the `Error` schema without regenerating, then undo the change.
- [x] 6.5 Add `openapi` to the required checks in the `require-pull-request` ruleset on `main` with `gh api`. Verify that the ruleset lists it, next to the existing checks.

## 7. Final checks

- [x] 7.1 Run `npm run lint`, `npx tsc --noEmit`, `npm run test:coverage`, and `npm run test:e2e`. Verify that all pass and that the coverage for `src/server/services` is at least 80%.
- [x] 7.2 Run `openspec validate t-03-api-foundation --strict`. Verify that it passes.

## Workflow follow-up

- On the pull request, prove the `openapi` check fails with a temporary commit that changes a documented schema without regenerating, then revert it (scenario "T-03 a stale document fails").
- Archive the change after the pull request is approved for merge, and point the pull request description's OpenSpec link to the archived change.
