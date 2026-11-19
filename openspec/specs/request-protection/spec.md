# request-protection Specification

## Purpose
Protects every request regardless of the endpoint it reaches: changes from other sites, request floods, and pages being framed or running injected script, as Security and testing §1 requires.

## Requirements

### Requirement: Changes only from the app's own origin

A request to `/api/v1` that changes data SHALL use `POST`, `PATCH`, or `DELETE`, and SHALL carry an `Origin` header equal to the origin of `APP_URL`. Otherwise it SHALL be refused with `403 FORBIDDEN` before the session, validation, or any service is used. `GET` requests SHALL NOT change data, and no origin check applies to them.

#### Scenario: T-03 change from another origin is rejected

- **WHEN** a `POST` arrives with an `Origin` header from another site
- **THEN** the response is 403 `FORBIDDEN`, and the endpoint's service is not called
- Verified by the integration test `rejects a change from another origin` (Security and testing §2.7), named with the T-03 prefix.

#### Scenario: T-03 change with no origin is rejected

- **WHEN** a `PATCH` or `DELETE` arrives with no `Origin` header
- **THEN** the response is 403 `FORBIDDEN`

#### Scenario: T-03 change from the app's own origin passes

- **WHEN** a `POST` arrives with the origin of `APP_URL` and a valid session
- **THEN** the request reaches the endpoint's service

### Requirement: Rate limit on API requests

Each signed-in user SHALL be limited to the "any API request" rate in the Security and testing §1 table, counted per user in a fixed one-minute window stored in the database. A request over the limit SHALL be refused with `429 RATE_LIMITED` and a friendly message asking the user to try again shortly, without calling the endpoint's service.

#### Scenario: AC-97 request over the rate limit is rejected with a friendly message

- **GIVEN** a signed-in user who has used every request the limit allows in the current minute
- **WHEN** they send another request
- **THEN** the response is 429 `RATE_LIMITED`, the message is the translation-file text asking them to try again shortly in their language, and the endpoint's service is not called
- Verified by an integration test with a controlled clock (Security and testing §2.4).

#### Scenario: T-03 requests under the limit pass

- **GIVEN** a signed-in user under the limit
- **WHEN** they send a request
- **THEN** it reaches the endpoint's service

#### Scenario: T-03 the limit resets in the next window

- **GIVEN** a user who reached the limit
- **WHEN** the clock moves into the next minute and they send a request
- **THEN** it reaches the endpoint's service

#### Scenario: T-03 each user has their own count

- **GIVEN** one user who reached the limit
- **WHEN** another user sends a request in the same minute
- **THEN** it reaches the endpoint's service

#### Scenario: T-03 simultaneous requests are all counted

- **WHEN** several requests from one user are counted at the same time on separate database connections
- **THEN** the stored count equals the number of requests, so concurrent requests can't get past the limit

### Requirement: Per-action rate limits use the same limiter

The limiter SHALL accept an action name and its limit and window, so the per-action limits in the Security and testing §1 table are applied by the tickets that build those actions, on top of the "any API request" limit, with the same response.

#### Scenario: T-03 an action limit is counted separately

- **GIVEN** a user over an action's limit but under the general limit
- **WHEN** they make a request for that action
- **THEN** it is refused with 429 `RATE_LIMITED`
- **AND** a request for a different action still passes

### Requirement: Security headers on every response

Every response, for pages and for the API, SHALL include the headers in Security and testing §1: a Content Security Policy that allows only the app's own scripts and forbids framing, HSTS, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.

#### Scenario: T-03 a page has the security headers

- **WHEN** the home page is requested from a production build
- **THEN** the response has each header, and the policy includes `frame-ancestors 'none'` and allows no inline script that the app didn't mark with its per-request value
- Verified by a browser test that also checks the page renders with no policy violations in the console.

#### Scenario: T-03 inline script added to the page doesn't run

- **GIVEN** a page from a production build
- **WHEN** HTML with an inline event handler is added to it, as user text shown as HTML would
- **THEN** the handler doesn't run, and with the policy turned off the same handler does run
- Verified by a browser test in Chromium and WebKit.

#### Scenario: T-03 an API response has the security headers

- **WHEN** an `/api/v1` request is answered, including an error and an address with no route
- **THEN** the response has `X-Content-Type-Options: nosniff`, the referrer policy, HSTS, and a policy with `frame-ancestors 'none'`
- Verified by an integration test.
