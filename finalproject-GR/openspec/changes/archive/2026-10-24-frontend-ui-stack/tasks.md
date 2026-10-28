# Tasks

## 1. Tailwind CSS v4 + shadcn/ui scaffold

- [x] 1.1 Add `tailwindcss` and `@tailwindcss/postcss` as dev dependencies, create `postcss.config.mjs` registering the plugin, create `app/globals.css` with `@import 'tailwindcss';`, import it once from the root layout — verify `npm run dev -w apps/web` starts cleanly and a Tailwind-classed element's rule appears in the dev server's generated CSS output
- [x] 1.2 Run `npx shadcn@latest init`, resolving its prompts to this project's existing structure (`components/ui`, `lib/utils.ts`) — verify `components.json` exists, `npm run typecheck -w apps/web` passes; if the CLI's output doesn't compile cleanly against this Next.js 16.4.3 + Tailwind v4 + Turbopack combination, fall back to design.md's documented path (hand-written components matching shadcn's own MIT-licensed source) and note the fallback was used
- [x] 1.3 Add the primitives this change's existing screens need: `npx shadcn@latest add button input textarea label select card alert skeleton` — verify each generated file exists under `components/ui/` and `npm run typecheck -w apps/web` passes
- [x] 1.4 Run `npm run lint -w apps/web` and `npm run typecheck -w apps/web` — verify both pass (no app code consumes any of this yet, so no behavior to re-test)

## 2. TanStack Query plumbing and shared test helper

- [x] 2.1 Add `@tanstack/react-query` as a dependency; create a `QueryClient` and wrap it in `QueryClientProvider` in the root layout, inside `ClerkProvider` — verify `npm run dev -w apps/web` starts without throwing
- [x] 2.2 Add a shared `renderWithProviders` test helper (fresh `QueryClient` per call, `retry: false`) alongside the existing Vitest setup — verify a trivial smoke test rendering a component through it passes
- [x] 2.3 Run `npm run lint -w apps/web`, `npm run typecheck -w apps/web`, `npm run test -w apps/web` — verify all pass; nothing's behavior has changed yet

## 3. Migrate data fetching to TanStack Query

- [x] 3.1 Rewrite `lib/use-session.ts`/`lib/session-context.tsx` to fetch `GET /me` and `GET /projects/:projectId` via `useQuery` (query keys `['me']`, `['projects', projectId]`) instead of manual `useEffect`/`useState`, keeping the same `{ data, loading, error }`-shaped return so `Shell` and other consumers don't need to change — port `lib/use-session.test.ts` through `renderWithProviders`, asserting the same resolved shape and the same `role: null` case — verify the ported test passes
- [x] 3.2 Rewrite `TestCaseList` to fetch via `useQuery` (`['projects', projectId, 'test-cases']`), removing the `refreshToken` prop entirely — verify `components/test-cases/test-case-list.test.tsx`, ported to `renderWithProviders`, still asserts the same rendered fields and the same `canCreate`-gated button
- [x] 3.3 Rewrite `TestCaseDetail`'s read as `useQuery` (`['projects', projectId, 'test-cases', testCaseId]`) and its update/delete calls as `useMutation`, each invalidating `['projects', projectId, 'test-cases']` (and the detail's own key, for update) on success in place of the removed `refreshToken` — port `test-case-detail.test.tsx`'s five cases (script-blur PATCH, no-op blur, status-change PATCH, delete-confirm DELETE, no-delete-control) — verify all pass
- [x] 3.4 Rewrite `CreateTestCaseForm`'s submit as a `useMutation` calling `createTestCase`, keeping its `onCreated`/`onCancel` prop contract unchanged so `TestCasesScreen` doesn't need to change — port `create-test-case-form.test.tsx`'s two cases — verify both pass
- [x] 3.5 Re-run `components/test-cases/role-gating.test.tsx` against the migrated List/Detail components (update only its test-harness mocks for the new data-fetching mechanism, not its assertions) — verify all three role cases (Viewer/Contributor/Admin) still pass
- [x] 3.6 Run `npm run lint -w apps/web`, `npm run typecheck -w apps/web`, `npm run test -w apps/web` — verify all pass

## 4. Migrate the Create form to react-hook-form + zod

- [x] 4.1 Add `react-hook-form`, `zod`, `@hookform/resolvers` as dependencies; rewrite `CreateTestCaseForm`'s field state as `useForm` + `zodResolver` with a schema requiring a non-empty `name` and an optional `gherkinScript`, replacing the per-field `useState` — verify a new test: submitting with an empty name shows a validation error and does not call `createTestCase`; re-verify task 3.4's two existing cases still pass against the new implementation

## 5. Migrate styling to Tailwind + shadcn

- [x] 5.1 Rebuild `components/shell.tsx` with Tailwind utility classes and shadcn `Card`/`Button`, matching the existing sidebar/content layout; delete `components/shell.module.css` once nothing imports it — verify `components/shell.test.tsx` (ported to `renderWithProviders`) still passes, including the access-denied and loaded-with-role cases
- [x] 5.2 Rebuild `components/access-denied.tsx` with shadcn `Alert`, keeping its `role="alert"` and the same visible text `shell.test.tsx` already asserts on — verify that test still passes
- [x] 5.3 Rebuild `TestCaseList`/`TestCaseDetail`/`CreateTestCaseForm` markup with shadcn `Input`/`Textarea`/`Label`/`Select`/`Button`/`Card`, preserving every `aria-label` the existing tests query by (`'Name'`, `'Gherkin script'`, `'Status'`, `'New test case name'`, `'New test case script'`) — verify all five component test files still pass with no change to their query selectors
- [x] 5.4 Manual visual check: `npm run dev -w apps/web`, sign in with the existing `demo+clerk_test@example.com` test user, confirm Tailwind/shadcn styling is visibly applied (not unstyled Radix primitives) across sign-in, the shell, and the Test Cases screen

## 6. Final verification

- [x] 6.1 Run `npm run lint -w apps/web`, `npm run typecheck -w apps/web`, `npm run test -w apps/web` — verify all pass
- [x] 6.2 Run the full `apps/api` test suite once more — verify no regression (confirms this change touched nothing backend-side, as proposal.md states)
- [x] 6.3 Manual end-to-end dev-server walkthrough: sign in → Test Cases list renders → create a test case → edit its name/script/status → delete it (as Admin) → sign out — record the result in the session summary

## Workflow follow-up

- Archive this change once reviewed.
- Also archive `frontend-bootstrap`, which was completed but never archived — do this alongside or before this change's archive, not silently.
- Verify the archived result.
