# Proposal

## Why

[ADR 0011](../../docs/adr/0011-frontend-ui-stack.md) settled the frontend's styling, component, data-fetching, and form stack (Tailwind CSS v4 + shadcn/ui, TanStack Query, react-hook-form + zod), explicitly as something `frontend-bootstrap`'s screens should be migrated onto rather than left on their ad hoc patterns. Before any more screens get built on top of the current hand-rolled hooks (`useApiClient`, `useSession`) and plain CSS Modules, this change does that migration — the surface area is still one screen, and it only gets more expensive to unwind the longer two UI patterns coexist.

## What Changes

- Install and configure Tailwind CSS v4 (`@tailwindcss/postcss`) and initialize shadcn/ui; replace `components/shell.module.css` with Tailwind utility classes and shadcn primitives.
- Replace the hand-rolled `useApiClient` (`lib/api-client.ts`) with a TanStack Query `QueryClient` + a plain fetch function that still attaches the bearer token and still redirects to `/sign-in` on 401 (ADR 0009's mechanism is unchanged — only where it's wired in moves).
- Replace `useSession`/`session-context.tsx`'s manual `useState`/`useEffect` fetching with TanStack Query hooks (`useQuery` for `GET /me` and `GET /projects/:projectId`).
- Replace `TestCaseList`'s manual `refreshToken` counter with TanStack Query's cache invalidation (`queryClient.invalidateQueries`) after create/update/delete mutations.
- Replace the Create Test Case form's manual `useState`-per-field pattern with react-hook-form + zod validation.
- Rebuild the shell, access-denied state, and Test Cases list/detail/create UI with shadcn primitives (`Button`, `Input`, `Textarea`, `Select`, `Card`) styled with Tailwind, preserving every existing behavior and role-gated control exactly as already specified — **no new screens, no new PRD-driven features, no modal conversion of the inline create form** (that belongs with whichever change actually builds out each screen per PRD, not with this stack migration).
- All existing Vitest/RTL tests are ported to assert against the new implementation; coverage is preserved, not reduced.

## Capabilities

**Pure refactor — `skip_specs: true` set in `.openspec.yaml`.** No capability's observable behavior changes: `web-app-shell`'s existing requirements (sign-in/sign-up, route protection, sign-out, bearer-token attachment, landing redirect, role-gated Test Cases controls, access-denied state) all continue to hold exactly as specified, verified by porting every existing test rather than dropping coverage. This is a library/styling swap underneath already-specified behavior, not a change to what the system does.

### New Capabilities
(none)

### Modified Capabilities
(none — see above)

## Impact

- **`apps/web` dependencies (new):** `tailwindcss`, `@tailwindcss/postcss`, shadcn/ui's generated component files under `components/ui/` plus its Radix UI peer packages, `lucide-react`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`.
- **Removed:** `components/shell.module.css` (replaced by Tailwind utilities), the manual `refreshToken`-counter pattern in `TestCaseList`.
- **Rewritten, same behavior:** `lib/api-client.ts`, `lib/use-session.ts`, `lib/session-context.tsx`, `components/shell.tsx`, `components/access-denied.tsx`, `components/test-cases/*`, and their tests.
- **Unchanged:** `proxy.ts`/`lib/route-protection.ts` (Clerk route protection — no data-fetching or styling concern), `lib/landing.ts`, `lib/test-case-permissions.ts` (pure logic, no library dependency to swap), the backend (`apps/api`) — nothing here touches it.
- **Verification risk flagged, not assumed:** shadcn/ui's CLI compatibility with this project's exact Next.js 16.4.3 + Tailwind v4 + Turbopack combination is checked at task time (same posture `frontend-bootstrap` took toward `@clerk/nextjs`'s Next 16 compatibility), not assumed from general knowledge.
