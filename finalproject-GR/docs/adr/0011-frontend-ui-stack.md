# ADR 0011: Frontend UI Stack

**Status:** Accepted, amended by [ADR 0014](0014-drag-and-drop-and-ordering.md) (drag and drop and ordering keys)
**Date:** 2026-10-24
**Amends:** [ADR 0001](0001-tech-stack.md) (adds the frontend UI layer below the framework choice, which ADR 0001 did not cover; partially resolves open question F6)

## Context

[ADR 0001](0001-tech-stack.md) settled Next.js (React, App Router) as the frontend framework and [ADR 0009](0009-api-authentication-transport.md) settled the bearer-token transport to the API, but neither decided *how* the UI itself is built: styling, component primitives, data fetching/caching, or form handling. The `frontend-bootstrap` change (the first real frontend code) had to make several of these calls ad hoc just to ship one screen, to avoid blocking on the then-unresolved open question F6: plain CSS Modules, hand-rolled fetch hooks (`useApiClient`/`useSession`), a manual `refreshToken` counter standing in for cache invalidation, and uncontrolled-library form state. That was reasonable for one screen with two tiny forms, but [PRD.md](../../PRD.md) §6.x describes the same shapes at much larger scale: modals (New Test Case, New Execution with ~8 validated fields, New Bug, Environment editor), dropdowns and pickers (role changes, status changes, tag pickers, filters), and, per [roadmap-mvp.md](../roadmap-mvp.md) Phase 7, polling for live execution state instead of SSE. Continuing ad hoc per screen would mean re-deriving the same patterns (modal focus-trapping, form validation, cache invalidation, polling) by hand, repeatedly.

This Next.js version (16.4.3) is newer than any model's training data (`apps/web/AGENTS.md`'s own warning); the styling decision below was checked directly against this version's bundled docs (`node_modules/next/dist/docs/`) rather than assumed.

## Decision

**Tailwind CSS v4 + shadcn/ui, TanStack Query, react-hook-form + zod.**

1. **Styling: Tailwind CSS v4** (`@tailwindcss/postcss`) — Next.js's own current, Turbopack-supported styling path for this version, confirmed in its bundled docs (`01-app/01-getting-started/11-css.md`), which recommend exactly this: "Use Tailwind CSS for most styling needs... CSS Modules for component-specific styles when Tailwind utilities aren't sufficient." CSS Modules (already in use since `frontend-bootstrap`) stay as that fallback, not replaced outright.
2. **Component primitives: shadcn/ui** — Radix UI primitives underneath, Tailwind-styled, copied into the repo via its CLI rather than installed as an opaque npm dependency (component source lives in `apps/web/components/ui/`, readable/editable/typechecked like any other project file). Covers the PRD's recurring shapes: `Dialog` (every "New X" modal), `Select`/`DropdownMenu` (status/role changes), `Popover`/`Command` (tag pickers, filters) — with correct focus management and keyboard/screen-reader behavior built in rather than re-derived per modal.
3. **Icons: lucide-react** — shadcn's own default icon pairing; no separate icon-library decision needed.
4. **Data fetching & server state: TanStack Query.** Replaces `frontend-bootstrap`'s hand-rolled `useApiClient`/`useSession` pattern and its manual `refreshToken` counter with built-in caching, mutation-driven cache invalidation, retries, and — critically — `refetchInterval`-based polling, the exact mechanism roadmap-mvp.md Phase 7 already commits to for live execution state instead of SSE.
5. **Forms & validation: react-hook-form + zod.** Adopted now, ahead of the New Execution modal (Phase 7) that actually needs multi-field validation, so that modal doesn't force a stack change mid-project. Today's simpler forms (Create Test Case) move to the same pattern for consistency rather than keeping two form patterns in the codebase.
6. **The existing `frontend-bootstrap` screens (shell, sign-out, Test Cases list/detail/create) are refactored onto this stack as part of adopting it**, not left on the old ad hoc pattern — tracked as its own OpenSpec change, since the surface area is still one screen and letting two UI patterns coexist while more screens get built only gets more expensive to unwind later.

**Explicitly deferred, not decided here** (the rest of open-questions.md F6):
- Folder tree drag-and-drop library (e.g. dnd-kit) — no folder tree exists yet (deferred past MVP's flat Phase 4).
- Traceability graph library (e.g. React Flow) — PRD §6.3.5, not scheduled before Phase 7+ and explicitly deferred even within Phase 7's own MVP scope.
- Chart library (e.g. Recharts) — dashboards are Phase 9+ (roadmap-mvp.md), not started.
- The Gherkin script editor is **not** a library decision: PRD §6.2.3 specifies "a plain text area for the scenario script," which is already what's built (a `<textarea>`). No syntax-highlighting editor (CodeMirror/Monaco) is called for.

## Rationale

- **shadcn/ui's copy-in-repo model fits a project with no existing design system and a strong "read and own the code" norm already established elsewhere** (e.g. `secrets-encryption`/`tenant-context`'s hand-rolled mechanism modules rather than black-box libraries wherever feasible) — generated components are ordinary TSX files subject to the same lint/typecheck/review as everything else.
- **TanStack Query directly targets a requirement already committed to** (Phase 7's polling-instead-of-SSE), not a speculative future need — adopting it now means that phase doesn't build polling from scratch on top of today's hand-rolled fetch hooks.
- **react-hook-form + zod adopted ahead of need, deliberately.** The cost on today's trivial forms is low; the alternative (switching mid-project when the New Execution modal's 8 fields arrive) means two form patterns coexisting for a while and a forced rewrite of whatever forms exist by then.
- **Tailwind v4 over v3:** v4's Turbopack-first integration is what Next.js 16 documents as the current default path; v3's separate guide is explicitly flagged in Next's own docs as the broader-old-browser-support fallback, not the default.

## Alternatives Considered

- **A full component library (Mantine, Chakra, MUI) instead of Tailwind + shadcn/ui.** Faster initial velocity (more pre-built complex components: date pickers, data tables), but a heavier runtime dependency, its own theming system, and components that can't be read/modified in place the way shadcn's generated source can. Rejected for now; revisit if shadcn's primitive-level components prove too slow to assemble into the PRD's more complex pieces (e.g. the New Execution modal's locale/timezone pickers).
- **SWR instead of TanStack Query.** Lighter-weight, similar core idea. Rejected: TanStack Query's richer mutation/invalidation API and more directly documented polling pattern fit this project's needs (explicit cache invalidation after every create/update/delete, scheduled polling for execution state) more closely.
- **Keep plain fetch + custom hooks, and plain controlled components for forms (the `frontend-bootstrap` status quo).** Lowest dependency count. Rejected: both patterns were already visibly straining at one screen (a manual `refreshToken` counter standing in for cache invalidation); continuing them across the full PRD-sized UI means re-deriving caching, polling, and validation by hand, repeatedly.
- **Leave `frontend-bootstrap`'s screens as-is, apply the new stack only going forward.** Avoids a refactor right now. Rejected: the surface area to migrate is still one screen; deferring it means two coexisting UI patterns for however long it takes before a "convert the old screen" effort happens, which only gets more expensive as more screens are built against the old pattern in the meantime.

## Consequences

- New dependencies: `tailwindcss`, `@tailwindcss/postcss`, shadcn/ui's generated component files plus its Radix UI peer dependencies, `lucide-react`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers` (the zod/react-hook-form bridge).
- `apps/web`'s existing CSS Modules (`shell.module.css`) and hand-rolled hooks (`useApiClient`, `useSession`, the `refreshToken` pattern in `TestCaseList`) are refactored, not kept in parallel — tracked as a dedicated OpenSpec change before any new Phase 7 screen is built, so the codebase has one consistent frontend pattern going forward.
- The API client's token-attachment/401-redirect responsibility (ADR 0009) moves from a hand-rolled hook into a TanStack Query fetch function/`QueryClient` configuration — the bearer-token mechanism itself is unchanged, only where it's wired in.
- Every future screen (Executions, Bugs, Environments UI, dashboards) is expected to use this same stack; a future ADR is needed only for the still-open F6 items (drag-and-drop, graph, charts) when their phase starts.

## Revisit Triggers

- shadcn/ui's primitive-level components prove insufficient for a genuinely complex piece (e.g. the folder tree once it's a real feature) — evaluate a fuller component library then, scoped to that piece only.
- TanStack Query's polling pattern proves inadequate once Phase 7's real-time needs are better understood (e.g. if partial/granular updates turn out to be needed, not just "refetch everything on an interval") — revisit against SSE at that point, consistent with ADR 0005's "real-time return[s] when the automated engine is rebuilt" framing.
