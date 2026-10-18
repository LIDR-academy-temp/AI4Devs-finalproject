# Security and testing

**Assisted Shopping Platform: ComproParaTi** · **Version:** 1.4 (draft) · **Date:** October 17, 2026

Part of the project documentation ([readme](../readme.md)). IDs (`BR`, `FR`, `E`, `US`, `AC`) are defined in the [PRD](01-PRD.md).

---

## 1. Security

| Practice | How it is applied | Example |
| --- | --- | --- |
| Authentication | Google sign-in through Better Auth; no passwords. Users are identified by the provider's stable user ID (BR-02). | A user who changes their Gmail address keeps the same account. |
| Sessions | Database sessions in a signed `httpOnly`, `Secure`, `SameSite=Lax` cookie, expiring under BR-03. Signing out deletes the session. Session caching in the cookie is turned off, so every request checks the database. | A stolen cookie stops working as soon as the user signs out. |
| Authorization | Every service call checks the user's membership in the group that owns the data (BR-12). Resources outside the user's groups return the same "not available" response as missing ones (BR-13). | A buyer requesting another group's item gets a 404, identical to a deleted item. |
| Cross-site request forgery | All changes require `POST`, `PATCH`, or `DELETE`, a same-site cookie, and an `Origin` header that matches the app's own address. | A form on another site cannot reserve an item for the user. |
| Input validation | Zod schemas validate every request body and query against BR-32 before any service runs. | A 5,000-character note is rejected with a field error. |
| Output encoding | React escapes all user text, and the app never renders user content as HTML. | Notes containing `<script>` display as text (AC-95). |
| Link lookup (SSRF) | Only `http` and `https`. The host name is resolved, and loopback, private, link-local, and cloud metadata addresses are blocked, including after each redirect. At most 5 redirects, a 5-second timeout, only the first 1 MB of HTML read (the title and image tags are near the top), and images up to 5 MB of type JPEG, PNG, WebP, or GIF, with the type read from the file contents rather than the server's header. | `http://169.254.169.254/` is never requested (AC-44). |
| Rate limits | Counters per user and action, stored in Postgres. Over the limit, the API returns 429 with a friendly message (AC-97). | See the table below. |
| Security headers | Content Security Policy, HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `frame-ancestors 'none'`. | The app cannot be embedded in another site. |
| Secrets | Environment variables only. The cron route requires `CRON_SECRET`. | Calling `/api/cron/daily-email` without the secret returns 401. |
| Privacy | Minimal data. No government ID numbers. Account deletion erases personal data (BR-05). Thumbnails are product images at random, unguessable addresses and contain no personal data. | A deleted user's name, email, and phone are removed from the database. |
| Dependencies | Automated dependency update pull requests and an audit step in CI. | A vulnerable package version fails the build. |

**Rate limits:**

| Action | Limit per user |
| --- | --- |
| Any API request | 120 per minute |
| Link lookups | 20 per minute |
| Creating invitations | 30 per day |
| Creating items | 200 per hour |

---

## 2. Testing strategy

The whole test suite runs the same way on a developer's machine and in CI. It needs only Node.js, Docker for the local Postgres, and the browsers Playwright installs. No test calls Google, Resend, Vercel Blob, or a store website.

### 2.1 Test levels

| Level | Tool | Runs against | What it covers |
| --- | --- | --- | --- |
| Unit | Vitest | No database: domain services with in-memory fakes and a controlled clock | Business rules: status transitions (BR-22), undo (BR-24), deletion and archive conditions, email grouping (BR-31), field limits (BR-32), the shared Zod schemas, and the link lookup address check. The most tests, and the fastest. |
| Integration | Vitest | The test database in Postgres: Docker locally, a service container in CI | Every API endpoint, by calling its route handler with real HTTP requests and without starting a server: authentication, authorization, validation, error format, rate limits, concurrency, and migrations. Each response is also checked against the Zod schema that generates the OpenAPI document. |
| Browser | Playwright | A production build on localhost, with the local adapters and the seed data | Flows A, B, C, E, and F ([UX design §1](02-UX-DESIGN.md#1-user-flows)) in Spanish and English on a phone-size screen in Chromium. The core cycle also runs in WebKit on an iPhone-size screen, because many users will be on iPhones. |
| Accessibility | @axe-core/playwright | The browser tests | Automated WCAG 2.1 AA checks on every screen. |
| Deployment check | Manual | Production | The check after each deployment ([Infrastructure §3](06-INFRASTRUCTURE.md#3-deployment-process)). |
| Usability | Manual | A pilot build | 5 older adults, as a launch criterion ([PRD §8](01-PRD.md#8-release-plan-and-launch-criteria)). |

### 2.2 What each component is tested with

| Component ([Architecture §1.4](03-ARCHITECTURE.md#14-components-c4-level-3)) | Tests |
| --- | --- |
| Domain services | Unit tests for every rule; integration tests for transactions and concurrency. |
| REST API | Integration tests per endpoint: a success case, a validation error, each permission case, and the rate limit. A request for something in another group gets exactly the same 404 as a missing item (BR-13). |
| Authentication | Integration tests for session renewal and expiry (BR-03) with a controlled clock, and for sign-out deleting the session. Google itself is not tested. |
| Web interface | Browser tests only. There are no separate component tests for the MVP: form behavior that users see, such as field validation (FR-39), is covered in the browser tests. |
| Data access and database | Constraint tests (T-02); every CI run applies all migrations to an empty database. |
| Link lookup (milestone 2) | Unit tests of the address check with fake DNS answers; integration tests with a fake fetcher that returns sample pages and images, which sharp processes for real. |
| Daily email job (milestone 2) | Integration tests that run the job twice and late, and check the captured emails (BR-31). |
| Translations | A unit test that the Spanish and English message files have the same keys; browser tests in both languages. |

### 2.3 Test data and isolation

- **Separate test database.** Integration tests use `comproparati_test`, a second database in the same local Postgres, migrated before each run. Development data is never touched.
- **A clean start per test file.** Before each integration test file, the tables are emptied and the seed data ([Data model §3](04-DATA-MODEL.md#3-seed-data)) is loaded again. Integration test files run one at a time, so they never share the database. Transactions that are rolled back are not used for isolation, because the concurrency tests need two connections.
- **Small factories.** Tests that need more data than the seed create it with small factory functions, so each test shows the data it depends on.
- **Browser tests** start from a freshly seeded database. Each scenario signs up its own users and creates its own group, so scenarios don't depend on each other.
- **No production data** is ever used in tests.

### 2.4 Sign-in, outside services, and time

| Dependency | In tests |
| --- | --- |
| Google sign-in | Browser tests sign in through the development-only sign-in ([Architecture §3](03-ARCHITECTURE.md#3-technical-decisions)), which works only on localhost, locally and in CI. Integration tests create sessions directly in the database. |
| Email (Resend) | The email adapter's test version keeps sent messages in memory, so tests check recipients, language, and content. |
| Thumbnails (Vercel Blob) | The local-folder adapter, writing to a temporary folder. |
| Store websites | The link lookup's fetcher is replaced by a fake. A local server with sample pages can't be used, because the address check correctly blocks localhost. |
| Time | Services read the current time from a clock they receive, never directly. Unit and integration tests set it, for example to 31 days after the last use (AC-06). Browser tests use the real clock. |
| Vercel Cron | Tests call the daily email route directly, with the cron secret. |

### 2.5 Running tests locally and in CI

| Command | What it does | Needs |
| --- | --- | --- |
| `npm run setup` | Also installs the Playwright browsers (Chromium and WebKit) and creates the test database | Docker |
| `npm test` | Unit and integration tests: the fast check before a commit | Local Postgres running |
| `npm run test:unit` | Unit tests only | Nothing |
| `npm run test:integration` | Integration tests only | Local Postgres running |
| `npm run test:e2e` | Builds the app, starts it on localhost with the local adapters and seed data, and runs the browser and accessibility tests | Local Postgres running |
| `npm run test:coverage` | Unit and integration tests with the coverage report | Local Postgres running |

CI runs the same commands, with a Postgres service container instead of Docker Compose ([Infrastructure §3](06-INFRASTRUCTURE.md#3-deployment-process)). A test that fails intermittently is fixed, or disabled with a linked GitHub issue, the same day. Playwright retries a failed test once in CI only, and the report lists every retried test.

### 2.6 Coverage targets

- **Acceptance criteria.** Every acceptance criterion ([PRD §17](01-PRD.md#17-acceptance-criteria)) has at least one automated test whose name starts with its ID, for example `AC-59 two buyers reserve at the same time`. Milestone 1 is complete when every criterion tagged M1 has a passing test; the report in T-17 lists each criterion and its test.
- **Code.** At least 80% line coverage for the domain services (`src/server/services`), measured with `@vitest/coverage-v8` over the unit and integration tests. CI fails below the target. Other code has no coverage target: pages are covered by the browser tests, and framework and configuration code is not tested directly.

### 2.7 Example test cases

| Test | Level | Checks |
| --- | --- | --- |
| `AC-59 two buyers reserve at the same time` | Integration | Two connections reserve the same pending item at once: exactly one succeeds, the other gets the conflict error, and the item has one buyer. |
| `AC-26 request for another group's items is rejected` | Integration | The response is the same 404 as for an item that doesn't exist (BR-13), so it reveals nothing. |
| `AC-06 session expires after 31 days without use` | Integration | With the clock set 31 days after the last use, the request is rejected as signed out; at 20 days, the session is renewed (AC-05). |
| `BR-22 rejects shipping an item that was not purchased` | Unit | Only the transitions in BR-22 are allowed. |
| `AC-95 notes with script tags are shown as text` | Browser | The tags appear as text, and nothing runs. |
| `AC-98 language prefilled on One last step` | Browser | Spanish is prefilled; switching to English changes the screen and saves English. |
| `rejects a change from another origin` | Integration | A `POST` with a foreign `Origin` header is rejected ([section 1](#1-security)). |
| `AC-44 internal link is never requested` (milestone 2) | Unit | Links to localhost, private addresses, and names that resolve to them are blocked before any request. |

### 2.8 Out of scope for the MVP

- Load and performance testing: request volume is low, and the free plans' limits are known.
- Visual regression testing.
- Separate interface component tests ([section 2.2](#22-what-each-component-is-tested-with)).
- Firefox and other browsers beyond Chromium and WebKit.
- Tests of one-off scripts, such as the GitHub issue setup script. The seed script is exercised by every test run.
- Google, Resend, and Vercel themselves; the deployment check covers the production setup.
