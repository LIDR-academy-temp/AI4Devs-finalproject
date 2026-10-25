# Tasks

## 1. Backend: the minimal additions this slice needs (not full Project CRUD)

- [x] 1.1 Extend `provisionIdentity`'s new-workspace branch to also insert one default `project` row (e.g. name "My First Project", a derived slug) inside the same transaction — verify e2e test: after a never-seen Clerk identity's first request, exactly one `project` row exists for that workspace
- [x] 1.2 Verify idempotency still holds with the project included — verify e2e test: a second request for an already-provisioned identity creates no second project and resolves the same project id as the first request
- [x] 1.3 Extend `GET /me`'s response with `projectId` (the workspace's one project, resolved by `workspace_id`) — verify e2e test: the response includes `projectId` matching the row from 1.1
- [x] 1.4 Extend `GET /projects/:projectId`'s response with `role`, taken from `request.auth.projectRole` that `ProjectRoleGuard` already resolves — verify e2e test, once per role: a Viewer/Contributor/Admin caller each see their own correct `role` in the response
- [x] 1.5 Enable CORS in `main.ts` for the local dev origin (`http://localhost:3000`, overridable by an env var, defaulting to that) — verify e2e test: a request with an `Origin: http://localhost:3000` header receives a matching `Access-Control-Allow-Origin` response header
- [x] 1.6 Run `npm run lint -w apps/api`, `npm run typecheck -w apps/api`, and the full `apps/api` test suite — verify all three pass with no regressions from 1.1–1.5

## 2. Frontend: scaffold, dependencies, Vitest setup

- [x] 2.1 Add `@clerk/nextjs` as a dependency and `vitest`, `@vitejs/plugin-react`, `vite-tsconfig-paths`, `jsdom`, `@testing-library/react`, `@testing-library/dom` as dev dependencies to `apps/web/package.json` — verify `npm install` succeeds from the repo root
- [x] 2.2 Add `apps/web/vitest.config.mts` (jsdom environment, `tsconfigPaths()` + `react()` plugins) and a `test` script in `apps/web/package.json` — verify `npm run test -w apps/web` runs cleanly with zero tests collected
- [x] 2.3 Document `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL`, and the now-actually-used `CLERK_SECRET_KEY` in CLAUDE.md's Environment variables section, same "set in your shell, no `.env` file" convention as the API's vars — verify the section reads correctly and names all three

## 3. Frontend: Clerk wiring and route protection

- [x] 3.1 Wrap the root layout in `ClerkProvider` — verify `npm run typecheck -w apps/web` passes and `npm run dev -w apps/web` starts without throwing
- [x] 3.2 Add `app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/page.tsx` rendering Clerk's `<SignIn>`/`<SignUp>` — verify the dev server serves both routes without a server error (actual rendering of Clerk's hosted form requires a real publishable key — flag this explicitly in the session summary as the one check that needs a real Clerk account, matching identity-provisioning's precedent for live JWKS verification)
- [x] 3.3 Implement `proxy.ts` for session-based route protection: first try `@clerk/nextjs`'s route-protection helper wrapped for Next.js 16's `proxy.ts` convention; if its installed version doesn't support that cleanly, fall back to a hand-written `proxy.ts` using `@clerk/nextjs`'s `auth()` helper (design.md's documented fallback) — verify a unit test (or, if the mechanism can't be isolated from the Next.js request pipeline, a written manual check) confirming the redirect decision: protected path + no session → redirect to `/sign-in`; `/sign-in` or `/sign-up` + active session → redirect away
- [x] 3.4 Add a sign-out control (user menu) calling `@clerk/nextjs`'s `useClerk().signOut()`, redirecting to `/sign-in` afterward — verify Vitest component test: invoking the control calls `signOut` and navigates to `/sign-in`

## 4. Frontend: typed API client

- [x] 4.1 Implement `lib/api-client.ts`: a `"use client"` fetch wrapper reading `NEXT_PUBLIC_API_URL`, attaching `Authorization: Bearer <token>` via `useAuth().getToken()` to every request, and redirecting to `/sign-in` on a `401` response — verify Vitest test: a mocked `getToken()` value appears in the request's `Authorization` header; a mocked `401` response triggers the sign-in redirect and does not throw an unhandled error
- [x] 4.2 Implement a small data hook (e.g. `useSession()`) composing `GET /me` and `GET /projects/:projectId` through the client, exposing `{ workspaceId, projectId, role }` — verify Vitest test: given mocked API responses, the hook resolves to the expected shape, and resolves `role: null` when the project response carries no role

## 5. Frontend: app shell and landing

- [x] 5.1 Build the authenticated shell layout (workspace name, a Test Cases nav link, user menu with sign-out from 3.4) wrapping the protected route group — verify `npm run dev -w apps/web` serves it without a server error
- [x] 5.2 Implement root `/` landing: redirect a signed-in user to `/test-cases`, an unauthenticated visitor to `/sign-in` — verify Vitest test for the redirect-decision logic (extracted as a pure function of session state) covering both branches
- [x] 5.3 Implement the access-denied state (web-app-shell spec: "A user with no access to their resolved project...") shown when `useSession()`'s `role` resolves to `null` — verify Vitest test: rendering the shell with a null-role session shows the access-denied state instead of the Test Cases screen

## 6. Frontend: Test Cases screen

- [x] 6.1 List view: fetch `GET /projects/:projectId/test-cases` via the API client, render name/status badge/source-type badge per row — verify Vitest test: given a mocked list response, each row renders the expected name, status, and source type
- [x] 6.2 Detail panel: selecting a row shows name, status, source type, and the Gherkin script in a textarea; inline name edit and script autosave-on-blur each call `PATCH` — verify Vitest test: blurring the script textarea after a change triggers a `PATCH` call carrying the new script value
- [x] 6.3 Status change control calling `PATCH` with the new status — verify Vitest test: selecting a new status triggers a `PATCH` call carrying it
- [x] 6.4 Create flow: a form capturing name and an optional initial script, calling `POST` — verify Vitest test: submitting valid input calls `POST` with the entered values and surfaces the created test case in the list afterward (via a refetch or optimistic update, either is acceptable)
- [x] 6.5 Delete flow: a confirm step calling `DELETE`, removing the item from the list on success — verify Vitest test: confirming calls `DELETE` and the item no longer appears afterward
- [x] 6.6 Role-gated rendering matching web-app-shell's spec scenarios: no create/edit/delete control below `Contributor`; create/edit but no delete at `Contributor`; all three at `Admin` — verify Vitest test for each of the three roles, asserting the exact control set present

## 7. Final verification

- [x] 7.1 Run `npm run lint -w apps/web`, `npm run typecheck -w apps/web`, and `npm run test -w apps/web` — verify all three pass
- [x] 7.2 Re-run `npm run lint`, `npm run typecheck`, and the full test suite for `apps/api` (already covered in 1.6, repeated here only if anything in groups 2–6 touched shared config) — verify no regressions
- [x] 7.3 Write down, in the session summary, exactly what remains to be checked manually once a real Clerk account and publishable key exist (sign up, sign in, sign out, the proxy redirect behavior against a real session) — this is a recorded follow-up, not a silent gap, matching identity-provisioning's precedent for live Clerk verification

## Workflow follow-up

- Archive the change once reviewed.
- Verify the archived result.
