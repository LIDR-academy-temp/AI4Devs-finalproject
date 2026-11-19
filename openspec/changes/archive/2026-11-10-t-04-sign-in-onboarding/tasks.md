# Tasks

T-04's acceptance criteria are AC-02 (tasks 5.4 and 8.3), AC-03 (tasks 5.5 and 8.4), AC-04 (tasks 6.3 and 8.6), AC-05 (task 3.5), AC-06 (task 3.6), and AC-98 (task 8.2). The other scenarios are named after the rule they verify or after the ticket, as [Security and testing §2.6](../../../docs/07-SECURITY-AND-TESTING.md#26-coverage-targets) describes. Of the definition of done, all three items in scope apply: lint and type checks with an up-to-date OpenAPI document (group 9), interface text in Spanish and English (task 7.6), and the owning documents (group 1).

## 1. Documents first

- [x] 1.1 Update `docs/08-WORK-TICKETS.md`: T-04's scope adds page translations, Tailwind CSS with the design tokens, and the shadcn/ui components its screens use; T-05's scope keeps the shell, navigation, shared state components, formatting, and the desktop layout, building on T-04's setup; T-10's scope replaces the `/lists` placeholder. Update the header. Verify that no scope item is in two tickets.
- [x] 1.2 Update `docs/03-ARCHITECTURE.md` §3, the local sign-in row: sign in by email, as the user with that email or as a new user who hasn't completed onboarding, behind `DEV_SIGN_IN`. Update the header.
- [x] 1.3 Update `docs/06-INFRASTRUCTURE.md` §2 and §7 to name `DEV_SIGN_IN` as a setting, not a secret, and add it to `.env.example` as `DEV_SIGN_IN=true` with a comment pointing to §7. Update the header. Verify that the `developer-environment` scenario "Every variable is listed" still holds.
- [x] 1.4 Update `docs/05-API.md`: in §1, `FORBIDDEN` also covers a user who hasn't completed onboarding; in §2, `POST /me/onboarding` returns the current user, and a second call changes nothing. Update the header.
- [x] 1.5 Update `docs/07-SECURITY-AND-TESTING.md` §2.4, the time row: session tests date the session rows, because Better Auth reads the system time. Update the header.
- [x] 1.6 Add to `docs/02-UX-DESIGN.md` §2.10 the English and Spanish for One last step, the age and terms checkbox, the WhatsApp number field, the email setting, Sign out, Save, and the development sign-in. Update the header.
- [x] 1.7 Run `npm run check:links`, and check that no rule text was copied from the PRD into the changed sections.

## 2. Interface foundation

- [x] 2.1 Add `postcss.config.mjs` and `src/app/globals.css` with Tailwind CSS and the DESIGN.md tokens in `@theme`, and load Plus Jakarta Sans with `next/font/google` in `src/app/layout.tsx` (design decision 7). Verify with `npm run build`.
- [x] 2.2 Add `components.json` and copy Button, Input, Label, Checkbox, and Switch into `src/components/ui` with the shadcn command, styled to DESIGN.md (48 px targets, 16 px text, focus ring). Verify with `npm run lint` and `npx tsc --noEmit`.
- [x] 2.3 Add `src/i18n/request.ts` choosing the language from the user, then the `language` cookie, then the browser, then Spanish; wrap `next.config.ts` with next-intl's plugin; set `<html lang>` and `NextIntlClientProvider` in `src/app/layout.tsx` (design decision 6). Verify with `npm run build` and that the security headers browser test still passes.

## 3. Sign-in and sessions

- [x] 3.1 Add `createAuth` in `src/server/auth/auth.ts` with the Drizzle adapter on `users`, `accounts`, `sessions`, and `verifications`, the session lengths, IP tracking off, implicit linking off, trusted origins, the app columns as additional fields, Google when configured, and `checkProviderUser` (design decision 1). Add `src/server/auth/index.ts` and `src/app/api/auth/[...all]/route.ts`. Verify with `npx tsc --noEmit` and `npm run build`.
- [x] 3.2 Add `createSessionReader` and `getSessionUser` in `src/server/auth/session.ts`, returning the renewed cookie headers; append them in the route wrapper (`src/server/http/route.ts`) and in `src/proxy.ts`; make it the default reader in `defaultRouteDependencies()` (design decision 2). Verify with `npx tsc --noEmit` and the existing tests.
- [x] 3.3 Add `tests/support/sessions.ts`, which inserts `sessions` rows with chosen dates and builds the signed cookie (design decision 8). Verify with the tests below.
- [x] 3.4 Test the scenario "T-04 an endpoint reads a real session" for `GET /me`. Verify that it passes.
- [x] 3.5 Write the test `AC-05 a user who used the app 20 days ago is still signed in` in `tests/integration/`, checking that `expiresAt` moves to 30 days from now and the response renews the cookie. Verify that it passes.
- [x] 3.6 Write the test `AC-06 a user who last used the app 31 days ago signs in again`, checking 401 `NOT_SIGNED_IN` from `GET /me`. Verify that it passes.
- [x] 3.7 Test the scenarios "BR-03 a session used twice in one day is renewed once", "BR-03 signing out deletes the session" (through `/api/auth/sign-out`), and "T-04 a sign-out from another origin is refused". Verify that they pass.
- [x] 3.8 Write unit tests for "BR-02 a Google profile without a verified email is refused" (`checkProviderUser`) and "BR-02 an identity is matched by the provider's ID, not by email" (the auth options). Verify that they pass.
- [x] 3.9 Serve only the Better Auth endpoints the app uses, through `createAuthHandler` in `src/server/auth/handler.ts`, and test "T-04 Better Auth's own account changes are not served". Verify that it passes.
- [x] 3.10 Test Google sign-in through Better Auth's sign-in and callback in `tests/integration/google-sign-in.test.ts`, answering Google's token endpoint in the test: "FR-01 a first Google sign-in creates the account and signs the user in", "BR-02 a returning identity signs in as the same user after its email changes", "BR-02 an identity whose email matches another user is not linked to them", and "BR-02 a Google profile without a verified email is refused". Verify that they pass, and that the linking test fails with implicit linking on.

## 4. Development sign-in

- [x] 4.1 Add the plugin in `src/server/auth/dev-sign-in.ts` with `POST /api/auth/dev/sign-in`, registered only when `devSignIn` is true, and `checkDevSignInSetting` called from `src/instrumentation.ts` and `createAuth` (design decision 3). Verify with `npx tsc --noEmit`.
- [x] 4.2 Test the scenarios "T-04 the development sign-in signs in a seed user", "T-04 the development sign-in creates a new user", and "T-04 the development sign-in doesn't exist when the setting is off". Verify that they pass.
- [x] 4.3 Write the unit test "T-04 the app refuses to start with the setting on outside localhost" for `checkDevSignInSetting`, covering `localhost`, `127.0.0.1`, `[::1]`, and a public hostname. Verify that it passes.
- [x] 4.4 Set `DEV_SIGN_IN=true` in the web server's environment in `playwright.config.ts`. Verify that `npm run test:e2e` starts the server.

## 5. Onboarding

- [x] 5.1 Add `onboardingRequestShape` to `src/shared/requests.ts`, and move getting started's body into `startWithoutInvitationIn` in `src/server/services/groups.ts`; add `completeOnboarding` in `src/server/services/me.ts`, writing `users` and running getting started in one transaction (design decision 4). Verify with `npx tsc --noEmit` and the existing getting-started tests.
- [x] 5.2 Add the `"before-onboarding"` access level and the onboarding check to `src/server/http/route.ts`, with `FORBIDDEN` in `routeErrorCodes`; use it for `GET /me`. Factories stay as they are: the test session reader carries the onboarding flag, and tests that need an onboarded factory user set `onboardedAt`. Verify that the existing tests pass.
- [x] 5.3 Add `POST /me/onboarding` in `src/app/api/v1/me/onboarding/definitions.ts` and `route.ts`, returning the `Me` schema. Verify with `npx tsc --noEmit` and `npm run build`.
- [x] 5.4 Write the integration test `AC-02 onboarding without the age and terms acceptance is refused`, with `acceptsTerms` missing and false, checking 422 naming the field and that the user is still not onboarded. Verify that it passes.
- [x] 5.5 Write the integration test `AC-03 an invalid WhatsApp number isn't saved`, checking 422 naming `whatsappNumber` and nothing saved. Verify that it passes.
- [x] 5.6 Test the scenarios "BR-06 completing onboarding gives a new user their group and first list", "BR-04 the number is saved in international format", "T-04 completing onboarding again changes nothing", and "T-04 onboarding without a session is rejected". Verify that they pass and every 200 response matches the `Me` schema.
- [x] 5.7 Test the scenarios "T-04 a user who hasn't completed onboarding is refused" (`GET /groups`) and "T-04 a user who hasn't completed onboarding can read themselves and complete it". Verify that they pass.

## 6. Profile endpoint

- [x] 6.1 Add `updateMeRequestShape` to `src/shared/requests.ts` and `updateProfile` to `src/server/services/me.ts`, writing `users` (design decision 4). Verify with `npx tsc --noEmit`.
- [x] 6.2 Add `PATCH /me` in `src/app/api/v1/me/definitions.ts` and `route.ts`, returning the `Me` schema. Verify with `npx tsc --noEmit`.
- [x] 6.3 Write the integration test `AC-04 a user can't remove their WhatsApp number`, sending `null` and `""`, checking 422 naming the field and the number unchanged. Verify that it passes.
- [x] 6.4 Test the scenarios "FR-04 a user changes their language", "FR-04 a user turns email off", "BR-32 an invalid number isn't saved", and "T-04 an empty change is refused". Verify that they pass and every 200 response matches the `Me` schema.

## 7. Screens

- [x] 7.1 Add the auth client and the phone field in `src/components/phone-field.tsx`, with countries named by `Intl.DisplayNames` and formatting with `AsYouType` (design decision 7). Verify with `npx tsc --noEmit` and `npm run lint`.
- [x] 7.2 Replace `src/app/(public)/page.tsx` with Welcome: product name, language selector writing the `language` cookie, Continue with Google, the sign-in error message, and the development sign-in form when it is on; send signed-in users on (design decision 5). Cover loading (button pending) and error states. Verify with `npm run build`.
- [x] 7.3 Add One last step in `src/app/(public)/onboarding/`: language prefilled from the request's language, the age and terms checkbox, the phone field, Continue calling `POST /me/onboarding`, field errors, and the "Couldn't save" state keeping the values; redirect signed-out and onboarded users. Verify with `npm run build`.
- [x] 7.4 Add `src/app/(app)/layout.tsx` with the sign-in and onboarding redirects, and the Lists placeholder in `src/app/(app)/lists/page.tsx` showing the first list's name through `getCurrentUser` and `listLists`, with a link to Profile. Verify with `npm run build`.
- [x] 7.5 Add Profile in `src/app/(app)/profile/`: language (saving with `PATCH /me` and switching the screen), WhatsApp number with Save, the email switch, and Sign out; cover the saving and "Couldn't save" states. Verify with `npm run build`.
- [x] 7.6 Add every new text to `src/i18n/en.json` and `src/i18n/es.json` (namespaces for Welcome, onboarding, Profile, the Lists placeholder, the phone field, the development sign-in, and shared actions), with the Spanish from UX §2.10, and remove the placeholder entries. Verify that `tests/unit/translations.test.ts` passes and no component contains a hard-coded string.

## 8. Browser tests

- [x] 8.1 Add a sign-in helper in `tests/e2e/` that signs in through the development sign-in with a new `@example.com` email, optionally completing onboarding through the API. Replace `tests/e2e/placeholder.spec.ts` with Welcome's tests: "FR-37 Welcome follows the browser's language", "FR-37 choosing a language on Welcome switches the screen", and "Page text comes from the message files". Verify that they pass.
- [x] 8.2 Write the browser test `AC-98 language prefilled on One last step`: Spanish chosen on Welcome is prefilled, switching to English changes the screen, and English is saved. Verify that it passes in Chromium and WebKit.
- [x] 8.3 Write the browser test `AC-02 the user can't continue without the age and terms box`. Verify that it passes.
- [x] 8.4 Write the browser test `AC-03 an invalid WhatsApp number is indicated and not saved`. Verify that it passes.
- [x] 8.5 Test the scenarios "T-04 a signed-out person is sent to Welcome", "T-04 a new user is sent to One last step", "T-04 an onboarded user skips onboarding", "T-04 a new user lands on their first list", and "T-04 a failed save keeps what the user entered" (One last step). Verify that they pass.
- [x] 8.6 Write the browser test `AC-04 Profile doesn't let the user remove their WhatsApp number`. Verify that it passes.
- [x] 8.7 Test the scenarios "AC-99 Profile in English", "FR-04 changing the language in Profile switches the screen", "BR-03 signing out from Profile", and "T-04 a failed save keeps what the user typed" (Profile). Verify that they pass.
- [x] 8.8 Test "T-04 Welcome has no accessibility violations", "T-04 One last step has no accessibility violations" (also with indicated fields), and "T-04 Profile has no accessibility violations" with Axe, in both languages. Verify that they report no violations.
- [x] 8.9 Write the browser tests `AC-99 Welcome in English` and `AC-99 One last step in English`, in a browser that prefers Spanish. Verify that they pass.

## 9. OpenAPI document and checks

- [x] 9.1 Regenerate `docs/openapi.yaml` with `npm run openapi:generate`. Verify that it has `POST /me/onboarding` and `PATCH /me`, that the other endpoints list `403`, and that a second run changes nothing.
- [x] 9.2 Check by hand that `npm run dev` with `.env` from `.env.example` shows Welcome with the development sign-in, and that signing in as Ana reaches the Lists placeholder (scenario "The app runs in development"). Record the check in the pull request.
- [x] 9.3 Run `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run test:coverage`, `npm run test:e2e`, and `npm run check:links`. Verify that all pass and the domain services keep at least 80% line coverage.
