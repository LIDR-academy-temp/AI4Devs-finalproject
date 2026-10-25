# Proposal

## Why

Every change through Phase 5 has stayed backend+DB only on purpose (roadmap-mvp.md's sequencing note), deliberately deferring a frontend-bootstrap slice until there was enough backend surface for a real first screen. Phase 4 (Test Cases) and Phase 5 (Environments & Secrets) are both now built, so that point has arrived. Before Phase 7 (Execution lifecycle, renumbered from the old Phase 6) layers more backend-heavy work on top, this change makes the product actually usable: a person can sign up, sign in, and see real, live test-case data through the web app — not just scaffolding. `apps/web` is still the Phase 1 placeholder page; this is its first real content.

While investigating what the frontend would need, two backend gaps surfaced that block any real demo regardless of frontend work: `provisionIdentity` creates a user and workspace but never a project, and there is no endpoint to list or create one (`GET /projects/:projectId` is the only route, and it requires already knowing an id). A signed-up user would therefore have zero projects and no way to get one. Per user decision, this change closes that gap minimally — auto-creating one default project at sign-up — rather than building full project CRUD, which stays a recorded gap for a later phase.

## What Changes

**Backend (minimal, to unblock the frontend — not full Project CRUD):**
- `provisionIdentity`'s new-workspace branch also creates one default project (e.g. "My First Project"), atomically, in the same transaction that already creates the workspace and Owner membership.
- `GET /me` additionally returns the resolved `projectId` (the workspace's one project, by construction in this slice).
- `GET /projects/:projectId` additionally returns the caller's effective project `role`, so the frontend can gate UI controls without a second round trip.
- The API enables CORS for the local Next.js dev origin (`http://localhost:3000`) — needed the moment a browser calls the API directly from a different port; production CORS origin is a separate, later deployment decision (open-questions.md E1–E4).

**Frontend (`apps/web`):**
- `@clerk/nextjs` integration (ADR 0009 already names this package): `ClerkProvider`, hosted `<SignIn>`/`<SignUp>` pages, and session-based route protection via Next.js 16's `proxy.ts` (the renamed `middleware.ts`).
- A single shared, typed API client (a thin fetch wrapper per ADR 0009's "not scattered per call site") that attaches the Clerk session token as `Authorization: Bearer <token>` to every request against the NestJS API.
- An app shell: root layout, a minimal sidebar (workspace name, a Test Cases nav link, user menu with sign-out) — no workspace/project switcher yet, since this slice assumes exactly one workspace and one project per signed-in user.
- The Test Cases screen: flat list + detail panel (PRD §6.2, minus folders/tags/health-banners/run-history, which don't exist in the backend yet) — list, create, inline-edit name, Gherkin script editor with autosave-on-blur, status change, delete — each control shown or hidden by the caller's project role (Viewer/Contributor/Admin).
- Landing behavior: signing in takes the user straight to their project's Test Cases screen (PRD §4.1's "last active project," simplified to "the" project since only one exists per workspace in this slice).

**Explicitly deferred (recorded gaps, not silent omissions):**
- Full Project CRUD (create additional projects, list multiple projects, project switcher) — PRD §6.9/§7.5.
- The Onboarding Welcome screen (PRD §4.3's three guided steps) — signing up lands directly on Test Cases instead.
- Folder tree, tags, health banners, run history, dashboards — none exist in the backend yet (later phases).
- A frontend UI kit / CSS framework choice (open-questions.md F6 stays open) — this slice uses plain CSS, no new styling dependency.

## Capabilities

### New Capabilities
- `web-app-shell`: the web app's identity and session layer — sign-up/sign-in/sign-out, session-based route protection, the authenticated API client, and role-aware access to the screens it hosts (starting with Test Cases).

### Modified Capabilities
- `identity-provisioning`: first-contact provisioning also creates a default project; `GET /me`'s response also returns the resolved project id.
- `project-authorization`: a project response additionally exposes the caller's effective role for that project.

## Impact

- **DB:** no schema change — the default project uses the existing `project` table and columns.
- **API:** `provisionIdentity` (identity-provisioning) gains one more insert in its existing new-workspace transaction branch; `me.controller.ts` and `projects.controller.ts` each gain one more response field; `main.ts` gains a CORS config block.
- **Web:** first real code in `apps/web` beyond the Phase 1 placeholder — new dependency `@clerk/nextjs`; new env vars `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `NEXT_PUBLIC_API_URL` (both set in the shell, no `.env` loading, matching the API's existing convention); reuses the already-documented `CLERK_SECRET_KEY`.
- **Testing:** Vitest + React Testing Library + jsdom for `apps/web` (Next.js's own currently-documented approach — no Jest guide exists for this version), covering the API client and role-gated rendering logic. No browser-driven E2E in this slice.
- **Prerequisite:** a real Clerk account with a publishable key is needed for sign-in/sign-up to actually render and authenticate — same flagged-manual-step posture `identity-provisioning` already recorded for `CLERK_SECRET_KEY`/live JWKS verification. Until then, the app runs but Clerk's hosted components have nothing to talk to.
