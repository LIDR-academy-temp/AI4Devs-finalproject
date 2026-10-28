# Design

## Context

See proposal.md - Why. Current `apps/web` state (all from `frontend-bootstrap`): `components/shell.module.css` (plain CSS Modules) for layout; `lib/api-client.ts`'s `useApiClient()` hook (bearer-token attachment + 401→`/sign-in` redirect, per ADR 0009) called directly inside manual `useEffect`/`useState` data-fetching in `lib/use-session.ts` and each Test Cases component; `components/test-cases/test-case-list.tsx`'s manual `refreshToken: number` prop, bumped by the parent after any mutation, as a stand-in for cache invalidation; the Create Test Case form's one `useState` per field with hand-written validation. `lib/route-protection.ts`/`proxy.ts` (Clerk route protection) and `lib/landing.ts`/`lib/test-case-permissions.ts` (pure decision functions) have no styling or data-fetching concern and are untouched by this change.

This Next.js version (16.4.3) is newer than any model's training data (`apps/web/AGENTS.md`'s own warning, already acted on once in `frontend-bootstrap` for `@clerk/nextjs`'s compatibility). Tailwind v4's setup path for this version was already verified against the bundled docs while writing ADR 0011; shadcn/ui's CLI compatibility with it has not yet been verified and is called out below as a task-time check, not assumed.

## Goals / Non-Goals

**Goals:**
- Every existing behavior (sign-in/sign-up, route protection, sign-out, the bearer-token mechanism, landing redirect, role-gated Test Cases controls, the access-denied state, list/detail/create/delete) continues to work exactly as already specified in `web-app-shell`, verified by porting every existing test.
- Replace the three ad hoc patterns named in the proposal (CSS Modules, manual fetch/`useEffect`, manual `refreshToken` counter, manual form `useState`) with the ADR 0011 stack.

**Non-Goals:**
- No new screens, no PRD-driven feature work, no modal conversion of the inline create form (proposal.md's explicit scope boundary).
- No polling setup (`refetchInterval`) — nothing to poll yet; that's Phase 7 (Execution lifecycle).
- No visual redesign beyond what adopting shadcn's default theme naturally produces. No dark-mode decision beyond whatever shadcn's default `components.json` scaffolds.
- No change to `proxy.ts`/`lib/route-protection.ts` (Clerk's own mechanism, untouched), or to `apps/api`.

## Decisions

**Tailwind v4 setup exactly as ADR 0011/Next's own docs describe:** `tailwindcss` + `@tailwindcss/postcss` as dev dependencies, a `postcss.config.mjs` registering the plugin, `@import 'tailwindcss';` in a new `app/globals.css`, imported once from the root layout. No `tailwind.config.js` content-globs file — v4's PostCSS plugin scans the project automatically, unlike v3.

**shadcn/ui initialized via its own CLI (`npx shadcn@latest init`), not hand-assembled.** This generates `components.json` (path aliases: `components/ui`, `lib/utils.ts` for the `cn()` class-merging helper), and pulls in its own small dependency set (`clsx`, `tailwind-merge`, `class-variance-authority`) plus, per component added, that component's specific Radix UI package (e.g. `@radix-ui/react-slot` for `Button`, `@radix-ui/react-label` for `Label`, `@radix-ui/react-select` for `Select`). Components are added one at a time (`npx shadcn@latest add button input textarea label select card alert skeleton`) — only the primitives this change's existing screens actually need; `Dialog` is deliberately not added yet (no modal in this change's scope).

**TanStack Query's `QueryClientProvider` wraps the whole app, at the root layout, inside `ClerkProvider`.** Even though only `(app)`-group routes fetch data today, a single app-wide `QueryClient` is simpler than threading a second provider boundary through just that route group, and every future authenticated screen will need it regardless.

**`useApiClient()` keeps its current shape (a hook using `useAuth()`/`useRouter()`, returning a `request` function) — only its callers change.** The bearer-token attachment and 401→`/sign-in` redirect logic is unchanged (ADR 0009's mechanism). What changes is how callers use it: instead of `lib/use-session.ts` and each Test Cases component manually driving `useEffect`/`useState`, they pass `apiClient.request` as the `queryFn`/`mutationFn` to `useQuery`/`useMutation`. This is why `useApiClient()` stays a hook (it needs `useAuth()`/`useRouter()`, which are hooks) rather than becoming a plain importable function — `useQuery`'s `queryFn` closes over whatever the calling component already has in scope, including a hook's return value.

**Query keys follow REST resource shape, mirrored 1:1 from the existing API paths** — `['me']`, `['projects', projectId]`, `['projects', projectId, 'test-cases']`, `['projects', projectId, 'test-cases', testCaseId]`. This makes `queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'test-cases'] })` after a create/update/delete mutation a direct replacement for the `refreshToken` counter, and needs no new convention beyond "key mirrors the URL."

**react-hook-form + zod for the Create Test Case form only, in this change.** `test-case-detail.tsx`'s inline name-edit-on-blur and Gherkin-autosave-on-blur are deliberately *not* converted to react-hook-form — that pattern (save on blur, no submit button, no validation beyond "non-empty") doesn't map naturally onto a form library built around explicit submission, and forcing it would be a non-goal UI behavior change in disguise. Only the Create form (which already has an explicit submit action and the PRD-described name+optional-script validation) adopts it.

**Test infrastructure: a shared `renderWithProviders` helper wrapping `@testing-library/react`'s `render` in a fresh `QueryClientProvider` per test** (new `QueryClient` per render call, `retry: false` so failed mutations/queries in tests don't retry and slow the suite down). Existing tests that mocked `useApiClient` directly are updated to mock it the same way — `useQuery`/`useMutation` still call `apiClient.request` as their `queryFn`/`mutationFn`, so the mocking boundary is unchanged; only the rendering wrapper and the need to `await` React Query's own internal state settling (`waitFor`) are new.

## Risks / Trade-offs

- [shadcn/ui's CLI compatibility with Next.js 16.4.3 + Tailwind v4 + Turbopack is unverified] → Checked at task time before relying on it; if its generated output doesn't compile cleanly, fall back to adding the specific Radix primitives directly (`@radix-ui/react-*` + hand-written Tailwind classes matching shadcn's own component source, which is MIT-licensed and copyable by hand) — same end state, more manual assembly.
- [TanStack Query is a new runtime dependency with its own learning curve] → Accepted per ADR 0011; the payoff (polling for Phase 7, built-in cache invalidation) is deliberate, not incidental.
- [Porting every existing test risks silently narrowing coverage if a test is "simplified away" during the port rather than translated 1:1] → Each ported test keeps the same assertion intent as its `frontend-bootstrap` original (tasks.md cross-references the original test name), not just "a passing test exists."
- [`useApiClient()` remaining a hook (not a plain function) could tempt a future caller to call it conditionally or outside a component, violating React's hook rules] → Unchanged risk profile from `frontend-bootstrap`, not introduced by this change.

## Migration Plan

Incremental, dependency-ordered — each step keeps the app in a working, fully-tested state before the next starts:
1. Scaffold Tailwind v4 + shadcn/ui (no behavior change yet — nothing consumes them).
2. Add TanStack Query's provider and the shared test-rendering helper (no callers changed yet).
3. Migrate the data layer (`api-client.ts`'s callers: `use-session.ts`/`session-context.tsx`, then each Test Cases component) from manual fetching to `useQuery`/`useMutation`, one module at a time, porting that module's tests alongside it.
4. Migrate styling (shell, access-denied, Test Cases list/detail/create) from CSS Modules to Tailwind + shadcn primitives, preserving the same DOM structure/semantics the existing tests already assert against where reasonable.
5. Delete `shell.module.css` and the `refreshToken` prop once nothing references them.
6. Final verification: full lint/typecheck/test pass, plus a dev-server smoke check of sign-in → Test Cases → create/edit/delete, same manual checklist `frontend-bootstrap` used.

No rollback concern beyond normal git revert — this touches only `apps/web`, no data migration, no API contract change.
