# T-04 Sign-in, onboarding, and basic profile

**Issue:** [#30](https://github.com/ojordan0/AI4Devs-finalproject/issues/30) · **Ticket:** [docs/08-WORK-TICKETS.md, T-04](../../../docs/08-WORK-TICKETS.md#t-04-sign-in-onboarding-and-basic-profile) · **Branch:** `feat/t-04-sign-in-onboarding`

**Covers:** Epic E-01. Stories: US-01 (main), US-02. Functional requirements: FR-01, FR-02, FR-03, FR-04 (without account deletion), FR-37 (for the screens built here), FR-39 (onboarding and profile fields). Business rules: BR-01, BR-02, BR-03, BR-04, BR-06, BR-32. Acceptance criteria: AC-02, AC-03, AC-04, AC-05, AC-06, AC-98.

## Why

No one can use the app yet: every endpoint answers `401` because the session reader is a placeholder, and the only page is the scaffold's placeholder. T-04 lets a new user sign in with Google, complete onboarding, get their group and first list (BR-06, built in T-07), and land in the app. Every later screen and the browser tests depend on a signed-in user. D2 is due on November 19, 2026.

## What Changes

- **Sign-in (FR-01):** Better Auth with the Google provider, the Drizzle adapter, and database sessions. Identities are keyed by the provider's user ID, never by email, so providers can be added later without affecting existing accounts, and an account without a verified email is refused (BR-02). Sessions last 30 days from the last use, renewed at most once a day, and signing out deletes the session (BR-03). Better Auth's handler is mounted at `/api/auth/*`.
- **Session reader:** the placeholder in `src/server/http/session.ts` is replaced by one backed by Better Auth, used by `/api/v1` and by the pages.
- **Development-only sign-in:** a small Better Auth plugin that signs in by email, as the seed user with that email or as a new user who hasn't completed onboarding. It is registered only when `DEV_SIGN_IN=true`, and the app refuses to start with the setting on when `APP_URL` isn't on localhost (Architecture §3). Browser tests sign in with it.
- **Onboarding (FR-02, FR-03):** `POST /me/onboarding` saves the language, the WhatsApp number (BR-04, BR-32), and the age and terms acceptance (BR-01), and runs getting started from T-07 in the same transaction (BR-06).
- **Onboarding check:** every `/api/v1` endpoint except `GET /me`, `POST /me/onboarding`, and the invitation preview refuses a user who hasn't completed onboarding (API §1).
- **Profile (FR-04):** `PATCH /me` changes the language, the WhatsApp number (which can't be removed, BR-04), and the email setting.
- **Screens:** Welcome (product name, language selector, Continue with Google, and the development sign-in when it is on), One last step, Profile (language, WhatsApp number, email setting, sign out), and a placeholder at the Lists address that shows the user's first list until T-10 replaces it. Each screen's text is in Spanish and English, with loading and error states.
- **Interface foundation, only what these screens need:** next-intl for pages, choosing the language from the user, then the Welcome choice, then the browser; Tailwind CSS with the DESIGN.md tokens and font; and the shadcn/ui components the three screens use. The shell, navigation, shared state components, and date and number formatting stay in T-05.
- **Documents updated first**, because reviewing this ticket found gaps:
  - **T-04 builds screens before T-05's setup.** T-04 needs page translations and styling, which T-05 owned, and T-05 hasn't started. *Proposed:* T-04 sets up only what its screens use, and T-05 builds on it (Work tickets, T-04 and T-05).
  - **Who the development sign-in signs in.** It signs in "as a seed user", but every seed user has completed onboarding, so it can't test onboarding (AC-98), and each browser scenario signs up its own users (Security and testing §2.3). *Proposed:* sign in by email, creating a new user who hasn't completed onboarding when no user has that email (Architecture §3).
  - **The setting's name.** "An explicit setting" has no name. *Proposed:* `DEV_SIGN_IN` (Infrastructure §2 and §7, `.env.example`).
  - **Which error refuses a user who hasn't completed onboarding.** API §1 requires onboarding but names no error. *Proposed:* `403 FORBIDDEN`, since the interface never sends such a request (API §1).
  - **What onboarding returns, and calling it twice.** *Proposed:* it returns the current user, like `GET /me`; a second call changes nothing and returns the same (API §2).
  - **Where the user lands until Lists exists.** Flow A ends on Lists, which T-10 builds. *Proposed:* a placeholder at the Lists address, which T-10 replaces (Work tickets, T-10).
  - **Testing session expiry.** Better Auth reads the system time, so it can't take the services' clock. *Proposed:* session tests date the session rows in the past instead (Security and testing §2.4).
  - **Spanish text for the new screens.** UX §2.10 has no entries for One last step, the age and terms checkbox, the email setting, or Sign out. *Proposed:* add them.

## Capabilities

### New Capabilities

- `sign-in`: Google sign-in, identities, renewing database sessions, sign-out, and the development-only sign-in.
- `onboarding`: the Welcome and One last step screens, and `POST /me/onboarding` with getting started.
- `profile`: the Profile screen's language, WhatsApp number, email setting, and sign-out, and `PATCH /me`.

### Modified Capabilities

- `api-conventions`: endpoints now also require a user who has completed onboarding, except those API §1 lists.
- `developer-environment`: the placeholder page is replaced by Welcome, so its requirement and the local run scenario change.

## Non-goals

| Left out | Owner |
| --- | --- |
| Account deletion (`DELETE /me`, BR-05) | Milestone 2 (FR-04, increment 9) |
| Signing up through an invitation, which skips getting started (BR-06) | T-08 |
| Header, bottom navigation, group selector, Refresh, avatar, and the desktop sidebar | T-05 |
| Shared empty, loading, and error components, and date and number formatting (FR-38) | T-05 |
| Profile's groups, leaving a group, creating a group, and reporting a problem | Milestone 2 (FR-05, FR-19, FR-20) |
| The Lists screen | T-10 |
| Returning to the same screen with typed text after the session expires (AC-07) | Milestone 2 |
| Sending the daily email; T-04 only stores the setting (AC-90) | Milestone 2 (FR-36) |
| A terms page; the checkbox's text names the terms, but no terms document exists | Not planned in milestone 1 |

## Impact

- **Endpoints (new):** `/api/auth/*` (Better Auth, in `src/app/api/auth/[...all]/route.ts`), `POST /api/v1/me/onboarding` (in `src/app/api/v1/me/onboarding/`), and `PATCH /api/v1/me` (in `src/app/api/v1/me/`).
- **Endpoints (existing):** `GET /api/v1/me` keeps answering before onboarding; every other `/api/v1` endpoint gains the onboarding check.
- **Server code (new):** `src/server/auth/` (Better Auth configuration, the development sign-in plugin, and the session reader).
- **Server code (existing):** `src/server/http/route.ts` (onboarding check and the real session reader), `src/server/http/session.ts`, `src/server/http/schemas.ts` (request and response schemas), `src/server/services/me.ts` (onboarding and profile changes), `src/server/services/groups.ts` (getting started runs inside onboarding's transaction).
- **Shared code (existing):** `src/shared/requests.ts` gets the onboarding and profile request schemas, built from `fields.phone` in `src/shared/fields.ts`.
- **Pages (new):** Welcome (replacing `src/app/(public)/page.tsx`), One last step in `src/app/(public)/`, and Profile and the Lists placeholder in `src/app/(app)/`. `src/app/layout.tsx` (existing) gets the user's language and the font.
- **Components (new):** `src/components/ui/` with the shadcn/ui components these screens use, and the phone field in `src/components/`.
- **Translations (existing):** `src/i18n/en.json` and `es.json`; next-intl's request configuration (new) in `src/i18n/`.
- **Styling (new):** the global stylesheet with the DESIGN.md tokens, and the PostCSS configuration for Tailwind CSS.
- **Tables (existing):** `users` (written by sign-in, onboarding, and profile), `accounts`, `sessions`, `verifications` (Better Auth), and `groups`, `memberships`, `lists` (written by getting started). No schema change, so no migration.
- **Configuration (existing):** `.env.example` and `playwright.config.ts` gain `DEV_SIGN_IN`.
- **Generated file (existing):** `docs/openapi.yaml` gets the two new operations.
- **Changed documents:** `docs/02-UX-DESIGN.md` (§2.10), `docs/03-ARCHITECTURE.md` (§3), `docs/05-API.md` (§1, §2), `docs/06-INFRASTRUCTURE.md` (§2, §7), `docs/07-SECURITY-AND-TESTING.md` (§2.4), and `docs/08-WORK-TICKETS.md` (T-04, T-05, T-10).
- **Dependencies:** none added; `better-auth`, `next-intl`, `tailwindcss`, the shadcn/ui packages, and `libphonenumber-js` are already installed (Architecture §1.6).
