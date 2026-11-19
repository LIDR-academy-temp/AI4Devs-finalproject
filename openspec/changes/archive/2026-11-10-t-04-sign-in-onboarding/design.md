# Design

## Context

- `better-auth` (1.7), `next-intl`, `tailwindcss`, `@tailwindcss/postcss`, the shadcn/ui packages, and `libphonenumber-js` are installed but not set up. The schema already has Better Auth's `users`, `accounts`, `sessions`, and `verifications` tables, with the app's own columns on `users` (Data model §2).
- The route wrapper (`src/server/http/route.ts`) reads the user through a `SessionReader`, which is still `noSessionReader`. It has no onboarding check (T-07 design, non-goals).
- `getCurrentUser` and `GET /me` exist (T-07), and `startWithoutInvitation` runs getting started in its own transaction with the user's row locked (T-07 decision 3).
- `src/proxy.ts` gives every page request a nonce for the Content Security Policy. The only page is the placeholder in `src/app/(public)/page.tsx`, and `src/app/layout.tsx` hard-codes Spanish.
- Browser tests run a production build on localhost with the test database (`playwright.config.ts`), in Chromium and WebKit on phone-size screens.
- See proposal.md for why, and the specs for the required behavior.

## Goals / Non-Goals

**Goals:**

- One Better Auth setup used by `/api/auth/*`, the `/api/v1` route wrapper, and the pages, built by a factory so tests can point it at the test database and switch the development sign-in on.
- Sessions that really renew with use for pages as well as API calls, so BR-03 holds in the browser and not only in the database.
- Screens built from the DESIGN.md tokens and shadcn/ui components, with all text from the message files.

**Non-Goals:**

- No schema change. No `rateLimit` table for Better Auth (see Risks).
- No shell, navigation, or date and number formatting (T-05).
- No Google call in any test (Security and testing §2.4).

## Decisions

### 1. Better Auth is built by a factory in `src/server/auth/`

`createAuth({ db, appUrl, secret, google, devSignIn })` in `src/server/auth/auth.ts` returns a configured `betterAuth(...)` instance. `src/server/auth/index.ts` builds the app's instance from the environment, and tests build their own with the test database.

- **Adapter:** `drizzleAdapter(db, { provider: "pg", schema: { users, accounts, sessions, verifications }, usePlural: true })`. Better Auth generates UUIDs (`advanced.database.generateId: "uuid"`), matching the `uuid` columns.
- **Sessions (BR-03):** `session.expiresIn` 30 days and `session.updateAge` 1 day, with the cookie cache off, so every request checks the database. IP address tracking is off (`advanced.ipAddress.disableIpTracking`), matching the `sessions.ip_address` column's note. Cookies use Better Auth's defaults (`httpOnly`, `SameSite=Lax`), and `Secure` when `APP_URL` is `https`.
- **Identities (BR-02):** account linking by email is turned off (`account.accountLinking.disableImplicitLinking`), so a provider identity only ever matches by provider and account ID, which the `accounts` unique constraints already enforce. `user.validateUserInfo` calls `checkProviderUser`, a pure function that refuses a provider profile whose email isn't verified.
- **Google:** registered only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are both set. `mapProfileToUser` shortens the name to the 100 characters `users.name` allows.
- **App columns:** `language`, `onboardedAt`, and the other app columns are declared as `user.additionalFields` with `input: false`, so the session carries them and no sign-in request can set them.
- **Origins:** `baseURL` and `trustedOrigins` are `APP_URL`, so Better Auth refuses state changes from other origins, as the API does (Security and testing §1). `advanced.disableOriginCheck` is set to `false`, because Better Auth otherwise skips the check when it detects a test run.
- **Handler:** `src/app/api/auth/[...all]/route.ts` serves Better Auth through `createAuthHandler` (`src/server/auth/handler.ts`), which passes on only the endpoints the app uses: Google sign-in and its callback, the session, sign-out, the error page, and the development sign-in. Every other Better Auth endpoint, such as changing the user's name, answers 404, so no account change bypasses the `/api/v1` checks. The `nextCookies()` plugin isn't used: only the proxy and the API set cookies (decision 2).

*Alternatives:* a module-level instance only. Rejected: integration tests need the test database and the development sign-in, and must not depend on the developer's `.env`.

### 2. One session reader, which also renews the cookie

`createSessionReader(auth)` in `src/server/auth/session.ts` implements the existing `SessionReader`. It calls `auth.api.getSession({ headers, returnHeaders: true })` and maps the user to `SessionUser` (`id`, `language`, `onboarded`) from the session's user fields, with no extra query. A missing, expired, or deleted session gives `null`.

Better Auth renews a session by moving `expiresAt` and resending the cookie with a new `Max-Age`. A server component can't set cookies, so a session renewed only while rendering pages would keep its first cookie, and the browser would drop it 30 days after sign-in. That is the fixed lifetime BR-03 rules out. So:

- The reader also returns the `Set-Cookie` headers Better Auth produced. The route wrapper appends them to every `/api/v1` response.
- `src/proxy.ts` calls the same reader for page requests and copies those headers onto its response. Pages then read the session again, which no longer needs renewing.

`defaultRouteDependencies()` uses this reader instead of `noSessionReader`, which stays for tests that need no session. Pages use `getSessionUser()` from the same module, which reads the request headers with `next/headers`.

*Alternatives:* a session that never renews the cookie, with a 30-day `Max-Age` refreshed only at sign-in. Rejected: it signs users out 30 days after sign-in. Passing the user from the proxy to pages in a request header. Rejected: a header is easy to get wrong, and a forged one would sign anyone in.

### 3. The development sign-in is a Better Auth plugin behind `DEV_SIGN_IN`

`src/server/auth/dev-sign-in.ts` defines a plugin with one endpoint, `POST /api/auth/dev/sign-in`, taking `{ email }`. It finds the user by email through Better Auth's internal adapter, or creates one with the email, the part before the `@` as the name, and a verified email; then it creates a session and sets the cookie with Better Auth's own helpers, so the session is identical to a Google one. A deleted user has no email, so it can't be found.

- `createAuth` registers the plugin only when `devSignIn` is true. `index.ts` sets it from `DEV_SIGN_IN === "true"`.
- `checkDevSignInSetting(env)` throws an error naming `DEV_SIGN_IN` when the setting is on and the hostname of `APP_URL` isn't `localhost`, `127.0.0.1`, or `[::1]`. It runs in `src/instrumentation.ts` at server start, so the app refuses to start, and again when the auth instance is built, so a misconfigured function can't serve a request either.
- Welcome shows a small form for it, with an email field, only when the setting is on. Its text comes from the message files like any other.

*Alternatives:* gating on `NODE_ENV`. Rejected: browser tests run a production build, and Architecture §3 asks for an explicit setting.

### 4. Onboarding and profile changes are services; the wrapper checks onboarding

- `completeOnboarding(db, clock, userId, { language, whatsappNumber })` in `src/server/services/me.ts` runs one transaction: it locks the user's row, returns at once if `onboarded_at` is set, writes `language`, `whatsapp_number`, `terms_accepted_at`, `onboarded_at`, and `updated_at` with the clock's time, then runs getting started. It returns `getCurrentUser`.
- Getting started's body moves into `startWithoutInvitationIn(tx, clock, userId, language)`, which `startWithoutInvitation` wraps in its own transaction as before. Both lock the user's row first, so the lock order doesn't change, and onboarding can't leave a user onboarded without their group.
- `updateProfile(db, clock, userId, changes)` writes only the fields given, and `updated_at`.
- **Requests** in `src/shared/requests.ts`: onboarding takes `language` (one of `LANGUAGES`), `whatsappNumber` (`fields.phone`), and `acceptsTerms`, which must be `true`; anything else, including a missing value, is a field error (AC-02). `PATCH /me` takes optional `language`, `whatsappNumber` (`fields.phone`, not nullable, so `null` and `""` fail: AC-04), and `receiveEmails`, with at least one present, using the same check as the item edit.
- **Endpoints:** `POST /me/onboarding` in `src/app/api/v1/me/onboarding/`, and `PATCH /me` next to `GET /me`. Both return the `Me` schema.
- **Onboarding check:** the wrapper's `access` gains `"before-onboarding"`, used by `GET /me` and `POST /me/onboarding`. With the default `"signed-in"`, a user whose `onboarded` is false gets `403 FORBIDDEN` before rate limits, validation, or the handler. `routeErrorCodes` adds `FORBIDDEN` to those routes, so the OpenAPI document lists it.

*Alternatives:* a separate onboarding error code. Rejected: API §1 says `FORBIDDEN` covers requests the interface never makes, which is this case, and a new code would need its own message and handling.

### 5. Pages and where each user goes

| Address | Screen | Route group |
| --- | --- | --- |
| `/` | Welcome | `(public)` |
| `/onboarding` | One last step | `(public)` |
| `/lists` | Placeholder showing the first list's name, until T-10 | `(app)` |
| `/profile` | Profile | `(app)` |

- Welcome sends a signed-in user to `/onboarding` or `/lists`; `/onboarding` sends a signed-out user to `/` and an onboarded user to `/lists`; the `(app)` layout sends a signed-out user to `/` and a user who hasn't completed onboarding to `/onboarding`.
- Pages are server components that read the user with `getSessionUser()` and their data through services (`getCurrentUser`, `listLists`), never the database (Architecture §1.1). The placeholder uses the first group in `GET /me` order and its first list.
- Forms are small client components that validate with the shared request schemas as the user types and on submit (FR-39), and send `fetch` requests to `/api/v1`. A `VALIDATION_FAILED` response indicates the fields it names; a network failure shows the "Couldn't save" message and keeps the form's values (UX §2.7). The submit button shows that it's saving and can't be pressed twice.
- Continue with Google calls Better Auth's client (`createAuthClient` from `better-auth/react`) with `callbackURL: "/"`; a refused sign-in returns to Welcome with a message. Sign out calls the client's `signOut()` and goes to `/`.
- Profile shows the language, the WhatsApp number with Save, the email setting as a switch that saves when changed, and Sign out, with the secondary button style (DESIGN.md, Buttons).

### 6. Page language comes from next-intl's request configuration

`src/i18n/request.ts` is next-intl's `getRequestConfig`, used without locale prefixes in addresses. It picks the language in the order UX §2.8 gives: the signed-in user's, then a `language` cookie, then the browser's (`browserLanguage` from `src/server/http/language.ts`), then Spanish. `next.config.ts` is wrapped with next-intl's plugin. The root layout sets `<html lang>` from it and wraps pages in `NextIntlClientProvider`.

- The language selectors on Welcome and One last step write the `language` cookie (path `/`, one year, `SameSite=Lax`) and refresh the page, which switches the screen right away. One last step's field starts from the request's language, which is the Welcome choice (AC-98). On Continue, the field's value is sent and saved.
- Profile's selector saves with `PATCH /me`, writes the cookie too, and refreshes.
- The cookie holds only `es` or `en`; any other value is ignored. It isn't `httpOnly`, since the browser writes it, and it carries nothing private.

*Alternatives:* addresses with a locale prefix (`/es/…`). Rejected: the language is a user setting, and links shared on WhatsApp must open in the reader's language.

### 7. Styling and components

- `src/app/globals.css` imports Tailwind CSS and declares the DESIGN.md front-matter tokens as CSS variables in `@theme`, with the shadcn/ui variable names DESIGN.md uses. `postcss.config.mjs` uses `@tailwindcss/postcss`. Plus Jakarta Sans is loaded with `next/font/google`, which serves it from the app's own origin, so the Content Security Policy needs no change.
- `components.json` configures the shadcn command, which copies Button, Input, Label, Checkbox, and Switch into `src/components/ui`, restyled with the tokens (48 px targets, 16 px minimum text, visible focus ring).
- The language and country selectors are native `<select>` elements styled as inputs, because phones then show their own accessible pickers.
- **Phone field** (`src/components/phone-field.tsx`): a country selector and a number input. Countries come from `libphonenumber-js` (`getCountries`, `getCountryCallingCode`), named in the page's language with `Intl.DisplayNames`, so no country name is hard-coded (DESIGN.md, Content Constraints). The number is formatted as typed with `AsYouType`. A number starting with `+` works without a country. The default country is the region in the browser's preferred language, such as `US` from `es-US`, or none; Profile starts from the saved number's country.

### 8. Tests

- **Integration** tests build the auth instance with `createAuth` against the test database and use `createSessionReader` in the route dependencies. `tests/support/sessions.ts` inserts session rows with chosen dates and builds the signed cookie with Better Auth's `makeSignature` (from `better-auth/crypto`) and `BETTER_AUTH_SECRET`, as Security and testing §2.4 allows ("Integration tests create sessions directly in the database").
- **Time:** Better Auth reads the system time and can't take the services' clock. The session tests set the dates on the session rows instead: AC-05 has `createdAt` 45 days ago, `updatedAt` 20 days ago, and `expiresAt` in 10 days, and expects `expiresAt` to move to 30 days from now; AC-06 has an `expiresAt` from yesterday. The services keep taking the clock.
- **Factories** stay as they are. The test session reader carries the onboarding flag with the user, so existing tests keep their meaning, and tests that need an onboarded factory user set `onboardedAt`.
- **Unit** tests cover `checkProviderUser`, `checkDevSignInSetting`, and the auth options for BR-02 and BR-03. **Integration** tests run Google sign-in through Better Auth's own sign-in and callback, answering Google's token endpoint in the test (BR-02).
- **Browser** tests in `tests/e2e/` sign in through the development sign-in. Each scenario uses a new `@example.com` email, so seed users are never changed. A failed save is simulated with Playwright's `page.route` aborting the request. Axe checks run on each screen in both languages. `playwright.config.ts` sets `DEV_SIGN_IN=true` for the web server. `placeholder.spec.ts` is replaced by Welcome's tests.

## Open points in the documents

The documents left these points open or in conflict. Each is settled in the document that owns it, in this pull request; this section records why.

- **Screens before the interface setup.** T-04 builds three screens, but page translations, Tailwind CSS, and shadcn/ui were T-05's, and T-05 hasn't started. *Chosen:* T-04 sets up only what its screens need (decisions 6 and 7); T-05 keeps the shell, navigation, shared state components, formatting, and the desktop layout. *Changed:* [Work tickets, T-04 and T-05](../../../docs/08-WORK-TICKETS.md#t-04-sign-in-onboarding-and-basic-profile).
- **Who the development sign-in signs in.** "As a seed user" can't test onboarding, because every seed user has completed it, and Security and testing §2.3 has each browser scenario sign up its own users. *Chosen:* sign in by email, creating a new user when none has it (decision 3). *Changed:* [Architecture §3](../../../docs/03-ARCHITECTURE.md#3-technical-decisions).
- **The setting's name.** *Chosen:* `DEV_SIGN_IN`, on in `.env.example` for local work and set by Playwright. *Changed:* [Infrastructure §2 and §7](../../../docs/06-INFRASTRUCTURE.md#7-configuration) and `.env.example`.
- **The error for a user who hasn't completed onboarding.** *Chosen:* `403 FORBIDDEN` (decision 4). *Changed:* [API §1](../../../docs/05-API.md#1-conventions).
- **What onboarding returns, and calling it twice.** *Chosen:* the current user; a second call changes nothing (decision 4). *Changed:* [API §2](../../../docs/05-API.md#2-endpoints).
- **Where the user lands before Lists exists.** *Chosen:* a placeholder at `/lists` that T-10 replaces (decision 5). *Changed:* [Work tickets, T-10](../../../docs/08-WORK-TICKETS.md#t-10-lists-screen-item-form-and-item-page).
- **Testing session expiry with a clock.** Better Auth can't take the services' clock. *Chosen:* date the session rows (decision 8). *Changed:* [Security and testing §2.4](../../../docs/07-SECURITY-AND-TESTING.md#24-sign-in-outside-services-and-time).
- **Spanish text for the new screens.** *Chosen:* add One last step, the age and terms checkbox, the email setting, Sign out, and the development sign-in's text. *Changed:* [UX §2.10](../../../docs/02-UX-DESIGN.md#210-spanish-interface-strings).

No package outside [Architecture §1.6](../../../docs/03-ARCHITECTURE.md#16-dependencies) is needed. The shadcn command copies code and isn't installed.

## Risks / Trade-offs

- [Better Auth's own rate limiter keeps its counters in memory, so on Vercel each instance counts separately.] → It still slows a single client. Moving it to the database needs a `rate_limits`-style table for Better Auth, a schema change left for T-06 if the deployment shows a need.
- [Each page request reads the session twice: once in the proxy, once in the page.] → Both are primary-key lookups, and the second never writes. Acceptable at the pilot's size.
- [Google sign-in is never exercised by tests.] → As Security and testing §2.8 accepts; the deployment check in T-06 signs in with Google once. The profile check and the options that carry BR-02 and BR-03 have unit tests.
- [The `language` cookie can be set by the browser to anything.] → Only `es` and `en` are accepted; anything else is ignored.
- [`next/font/google` downloads the font at build time.] → CI already has network access for `npm ci`. The font is then served from the app's origin.
- [The onboarding check changes every endpoint's documented errors.] → `docs/openapi.yaml` is regenerated, and the OpenAPI test checks it is up to date.

## Migration Plan

No schema change and no migration. `DEV_SIGN_IN` is new: on in `.env.example`, unset in production, where the startup check would refuse it anyway. Rollback is reverting the pull request.
