# Design

## Context

See proposal.md - Why. `apps/web` is still the Phase 1 placeholder (`app/layout.tsx`/`app/page.tsx`, no dependencies beyond `next`/`react`/`react-dom`). This change writes its first real code. Two constraints shape everything below:

- **ADR 0009 already named the mechanism**: `@clerk/nextjs`'s `getToken()` feeding a single shared fetch wrapper that attaches `Authorization: Bearer <token>`; no cookie-based API auth. Clerk's own first-party cookie (used internally by its SDK for the frontend's own session) is unrelated and never read by the API — so the web app can still use Clerk's normal session/routing mechanics for its own purposes, just not for talking to our API.
- **This Next.js install (16.4.3) is newer than my training data** (`apps/web/AGENTS.md`/`node_modules/next/AGENTS.md` both flag this explicitly). I read the bundled docs at `node_modules/next/dist/docs/` before writing any task below. Two things changed from the Next.js most guides describe: `middleware.ts` is renamed to `proxy.ts` (same mechanism, new file name/export), and the only testing guide Next.js documents for this version is Vitest + React Testing Library — there is no Jest guide anymore.

## Goals / Non-Goals

**Goals:**
- A person can sign up, sign in, see their own real test cases, author/edit/delete them per their role, and sign out — against the real API, no mocks.
- The two small backend additions (default project, `GET /me` project id, project role in `GET /projects/:id`) that make the above possible without building full Project CRUD.
- Enough test coverage on the pieces that are actually unit-testable (the API client, role-gated rendering) to catch regressions; the rest is verified by running the dev server end-to-end.

**Non-Goals:**
- Project CRUD beyond the one auto-created default (proposal.md's recorded gap).
- The Onboarding Welcome screen (PRD §4.3), workspace switcher, folder tree, tags, health banners, run history, dashboards, reports — none of their backends exist yet, or they're explicitly deferred.
- Resolving open-questions.md F6 (frontend UI kit) in general — only deciding what this slice's few screens need.
- Browser-driven E2E (Playwright/Cypress) — not set up in this change.

## Decisions

**`@clerk/nextjs`, used two ways at once, matching ADR 0009's explicit split.** `ClerkProvider` wraps the root layout; `<SignIn>`/`<SignUp>` are Clerk's hosted components under catch-all routes (`app/sign-in/[[...sign-in]]/page.tsx`, same for sign-up — Clerk's own routing convention, so its internal navigation between sign-in steps works without extra routes). Route protection uses Clerk's own session cookie through its own mechanism (next decision) — this is Clerk's *own* frontend session, separate from the bearer token the API verifies. The bearer token itself comes from the client-side `useAuth().getToken()` hook, used only inside the API client (next-next decision). Two mechanisms, one library, exactly as ADR 0009 describes: Clerk's cookie never reaches the API; the API never sees anything but the bearer token.

**Route protection via `proxy.ts`, not a hand-rolled check in every page.** Next.js 16 renamed `middleware.ts` to `proxy.ts` (same mechanism). `@clerk/nextjs` ships a route-protection helper (`clerkMiddleware`, as of the version current at ADR 0009's writing) meant to be wrapped in exactly this file. **Risk flagged, not resolved here:** whether that package's installed version still exports under that name and is verified compatible with Next.js 16's `proxy.ts` convention is a task-time check (tasks.md), not assumed. Fallback if it isn't: a small hand-written `proxy.ts` that reads Clerk's session via `@clerk/nextjs`'s own `auth()` server helper and redirects — strictly an optimistic check per Next's own authentication guide ("Proxy... should not be used as a full session management or authorization solution"), which is fine here since the API still independently verifies the bearer token on every real data request regardless of what the frontend's redirect logic decides.

**The API client is a thin fetch wrapper, Client-Component-only, one shared module.** `getToken()` is a client hook, so anything using it must be a Client Component (`"use client"`). This also sidesteps a real limitation of this slice's chosen test tool: Next's own Vitest guide states async Server Components aren't unit-testable yet ("we recommend using E2E tests for async components") — so keeping data-fetching logic in Client Components, not async Server Components, is what makes it unit-testable at all here, not just a style preference. The wrapper reads `NEXT_PUBLIC_API_URL` for the base URL, attaches the bearer token, and on a `401` response redirects to sign-in (the session the client thought it had is no longer valid) rather than surfacing a raw error.

**CORS is a one-line, dev-only addition to `main.ts`.** `app.enableCors({ origin: 'http://localhost:3000' })` (or an env-driven origin list, defaulting to that). Production origin handling is a deployment-time decision tied to open-questions.md E1–E4 (hosting), not decided here — flagged, not silently assumed.

**Default project creation reuses `provisionIdentity`'s existing transaction shape exactly like `secrets-encryption`'s `createWorkspaceDek` did.** One more `INSERT INTO project (...)` inside the already-open transaction, after the workspace insert (since the FK needs `workspace_id` to exist) and before/after the membership insert (order doesn't matter between those two). No new helper function needed — this is a two-line addition to a function that already exists, not a new mechanism module.

**`GET /me` and `GET /projects/:projectId` each gain one field, not a new endpoint.** `GET /me`: one more `SELECT id FROM project WHERE workspace_id = ... ORDER BY created_at ASC LIMIT 1` (unambiguous in this slice — exactly one project per workspace by construction) alongside the existing Clerk-profile fetch, returned as `projectId`. `GET /projects/:projectId`: `ProjectRoleGuard` already resolves `request.auth.projectRole` before the handler runs; the handler just includes it in the response body as `role` instead of discarding it.

**No CSS framework, no component library.** Plain CSS (global stylesheet + a handful of CSS Modules for the shell/list/detail layout). This slice has exactly four real screens (sign-in, sign-up are Clerk's own UI; shell; Test Cases list+detail). Pulling in Tailwind, a design system, or a component kit for that is premature — open-questions.md F6 is about the *hard* UI pieces (folder tree drag-and-drop, Gherkin syntax highlighting, charts, traceability graph), none of which exist in this slice. Revisit F6 when one of those actually needs building.

**Testing: Vitest + React Testing Library + jsdom, component-level only.** Matches Next's own current guide (no Jest guide exists for this version). Covered: the API client's token-attachment and 401-redirect behavior; the role-gating logic that decides which controls render; the access-denied state. Not covered by automated tests in this slice: Clerk's hosted sign-in/sign-up forms themselves (that's Clerk's own tested code, same posture `identity-provisioning` already took toward not re-verifying Clerk's JWT library), and anything needing a real browser session — those are manual dev-server checks (tasks.md says explicitly where).

**Environment variables, no `.env` file, matching the API's existing convention.** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `NEXT_PUBLIC_API_URL` (new), `CLERK_SECRET_KEY` (already documented in CLAUDE.md, now actually used by `proxy.ts`). Next.js reads these from the shell environment at `next dev`/`next build` time same as any other process env var — no `.env.local` is introduced, consistent with "no `.env` loading in this repo."

## Risks / Trade-offs

- [`@clerk/nextjs`'s exact API surface for Next.js 16's `proxy.ts` convention is unverified until installed] → Flagged above with an explicit fallback (hand-written `proxy.ts` using `auth()`), not discovered mid-task.
- [No real Clerk account exists yet — sign-in/sign-up can be built and unit-tested at the component level but not verified end-to-end against a live account] → Same posture as `identity-provisioning`'s already-recorded gap; a flagged manual step once an account exists, not a blocking automated test here.
- [Default-project auto-creation is a stopgap, not real Project CRUD] → Accepted per explicit user decision (proposal.md); recorded as a gap, not silently assumed to be "done."
- [Plain CSS with no design system will need revisiting once harder UI pieces (folder tree, charts) arrive] → Accepted; F6 stays open, this slice doesn't foreclose any later choice.
