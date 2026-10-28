# Design

## Context

See proposal.md - Why. Current `apps/web` state:

- **Styling:**
  - Tailwind v4 with shadcn (`radix-nova` style, single `radix-ui` package), tokens in `app/globals.css` as `oklch` values under `:root` and `.dark`. Dark mode is already wired as a class variant (`@custom-variant dark (&:is(.dark *))`), but nothing ever sets `.dark`.
  - `--primary` is near-black (shadcn's neutral base); sidebar tokens (`--sidebar*`) already exist.
  - Geist Sans is loaded via `next/font` as `--font-sans`.
- **Shell:** `components/shell.tsx` is a fixed `w-56` `<aside>` with a project-name card, text `Link`s (`NAV_LINKS`, `aria-current` from `usePathname`) and a `SignOutButton`. `shell.test.tsx` covers access-denied, links and current marking.
- **Screens:** Executions and Bugs are split panes (`grid lg:grid-cols-[22rem_1fr]`); Test Cases stacks list, create form and detail vertically. Each screen hand-rolls its skeletons, empty text and error `Alert`.
- **Colors:** state colors are hard-coded Tailwind classes in two maps, `OUTCOME_COLORS` (`status-badge.tsx`) and `SEVERITY_COLORS` (`bug-badges.tsx`).
- **Gherkin:** scripts render as plain `<pre>` in three places: `run-panel.tsx`, `gherkin-snapshot.tsx` (bugs, with the failed-step band) and the Viewer branch of `test-case-detail.tsx`.
- **Tests:** Vitest + RTL with a `ResizeObserver`/`scrollIntoView` polyfill in `vitest.setup.ts`. Tests query by role and label, so restyling is safe as long as accessible names are kept.

## Goals / Non-Goals

**Goals:**
- One visual system: tokens, not ad-hoc classes, for every color that carries meaning.
- A shell that feels like a product: an icon sidebar, collapsible and remembered, with the user menu and theme.
- Consistent page anatomy and states across the three screens.
- Zero behavior change in existing flows. Every existing test keeps passing, adjusted only where the DOM legitimately moved (sign out into a menu, Test Cases layout).

**Non-Goals:**
- New features, API changes, resizable panes, an editable-code-editor, workspace/project switchers (proposal.md - deferred).

## Decisions

**Accent and tokens (`app/globals.css`):**
- `--primary` and `--ring` become an electric indigo: `oklch(0.51 0.23 277)` in light, `oklch(0.68 0.19 277)` in dark, foreground near-white. The sidebar mirrors it (`--sidebar-primary`, `--sidebar-ring`).
- Neutrals stay shadcn's.
- New semantic tokens (light/dark pairs), exposed to Tailwind through `@theme inline` as `--color-*`:
  - outcomes: `--pass` (green 0.62/0.70 L), `--fail` (red), `--review` (amber), `--pending` (neutral 0.70);
  - severities: `--sev-critical`, `--sev-high`, `--sev-medium`, `--sev-low`;
  - `--live` (the indigo accent, for In Progress).
- Components then use `bg-pass`, `text-fail` and so on, and `OUTCOME_COLORS`/`SEVERITY_COLORS` map to those classes. One place to retune, and contrast is checked once per pair (≥ 3:1 for dots and badges against card backgrounds, AA for text).
- Alternative rejected: keep raw Tailwind palette classes (`bg-emerald-600`). That needs dark variants scattered everywhere and gives no single source of meaning.

**Typography:** add `Geist_Mono` via `next/font` as `--font-mono`, used for Gherkin, timers, IDs and counts (`tabular-nums`). Body stays 14px (`text-sm`) in dense lists, with headings on a small scale (page title `text-xl font-semibold`). No new font sources; both fonts are already self-hosted by `next/font`.

**Dark mode via `next-themes`:** `ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange` wraps the app inside `ClerkProvider`. It injects the pre-paint script that prevents the wrong-theme flash, which the spec requires, persists to `localStorage`, and sets `.dark` to match the existing `@custom-variant`. `<html>` gets `suppressHydrationWarning`, per next-themes' docs. Alternative rejected: a hand-written inline script plus context, which re-implements next-themes' flash prevention and system listening for no gain. Verify at task time against the bundled Next 16 docs that a client provider in the root layout is still the documented pattern.

**Clerk theming:** `ClerkProvider appearance={{ variables: { colorPrimary: <indigo>, fontFamily: 'var(--font-sans)' } }}`. In dark mode, use Clerk's `dark` base theme from `@clerk/themes` if it's already a transitive dependency; otherwise set `variables` for background and text from the current theme. Checked at task time; whichever needs no new top-level dependency wins.

**Sidebar on shadcn's `sidebar` primitive** (`npx shadcn@latest add sidebar`):
- It provides what the spec asks for: `collapsible="icon"` (icon rail), `SidebarMenuButton tooltip=…` (names while collapsed), a cookie-persisted open state (`sidebar_state`), a mobile `Sheet` via `useIsMobile`, and `SidebarTrigger` with a keyboard shortcut (Ctrl/Cmd+B).
- Items are Test Cases (`ListChecks`), Executions (`PlayCircle`) and Bugs (`Bug`), as `SidebarMenuButton asChild isActive` around `Link`, keeping `aria-current="page"`.
- **Remembering the state:** the root layout reads the `sidebar_state` cookie server-side (`cookies()` from `next/headers`) and passes `defaultOpen` to `SidebarProvider`, which avoids a flash of the expanded sidebar on load. Note that `cookies()` makes the `(app)` layout dynamic. That's acceptable, since every `(app)` page already depends on a signed-in session, but it means `/executions`, `/bugs` and `/test-cases` stop being prerendered as static. Check that `next build` still succeeds.
- Alternative rejected: hand-extending the current `<aside>`. It would re-implement collapse, persistence, tooltips, mobile and a11y that the primitive already has.

**User menu** (`components/user-menu.tsx`): a `SidebarFooter` `DropdownMenu`.
- The trigger shows `Avatar` initials and the user's name from Clerk's `useUser()`, so it needs no API call.
- The menu holds a **Theme** radio group (Light/Dark/System via `useTheme`), a separator, and **Sign out**.
- `SignOutButton`'s logic is reused. It becomes a `DropdownMenuItem` that calls the same handler, and its existing test moves to the menu.

**Page header** (`components/page-header.tsx`): `title`, optional `description`, and an `actions` slot. Each screen renders it once above its split pane. *As implemented:* the primary "New …" action stays in each list card's header, beside the filters it relates to, rather than moving into the page header. Moving it would have meant either duplicate buttons or reworking the role-gating tests that render the list on its own, for no visible gain. The `actions` slot stays available for future screen-level actions.

**Test Cases → split pane:** reuse the `grid lg:grid-cols-[22rem_1fr]` layout. The list goes left; the detail or create form goes right, with an empty prompt when nothing is selected. Behavior and props are unchanged, and the screen's tests query by role, so they need no structural edits beyond the layout.

**Shared states** (`components/states/`):
- `ListSkeleton` (n rows) and `DetailSkeleton`.
- `EmptyState { icon, title, description, action? }`.
- `ErrorState { message, onRetry }`, where `onRetry` is the query's `refetch`.
- The three list components and three detail components switch to these. The existing empty-state texts that tests assert on ("No executions yet.", "No bugs yet.") are kept as the `title`.

**Toasts with `sonner`** (`npx shadcn@latest add sonner`, which reads `useTheme` from next-themes):
- `<Toaster richColors position="bottom-right" />` goes in the root layout.
- A tiny `lib/notify.ts` (`notifySuccess(message)`) wraps `toast.success`, so it can be mocked once in tests.
- Calls are added in each mutation's `onSuccess` for: test case created/deleted; execution created/updated/deleted and lifecycle transitions (e.g. "Execution started"); outcome recorded; bug filed/updated/deleted/linked; password revealed.
- Inline `ActionError` stays for failures, as the spec requires. Errors are not toasted, so the reason sits next to its control.

**Gherkin display** (`components/gherkin-view.tsx`): `GherkinView { script, failedStep? }` renders a two-column grid with a right-aligned muted line number and a mono line.
- A pure `lib/gherkin.ts` exports `splitKeyword(line) → { indent, keyword | null, rest }`. It matches the listed keywords at line start (after indentation), case-sensitively as Gherkin does.
- The keyword renders in the accent color, semibold, and comment lines (`#`) are muted.
- `GherkinSnapshot` (bugs) becomes `GherkinView` with `failedStep`, keeping `aria-label="Failed step"` on the band. The run panel and the Viewer test-case view use it too.
- Alternative rejected: a syntax-highlighting library (Shiki, Prism). It's heavy for ten keywords, and the editable textarea is deferred anyway.

**Live pulse:** the In Progress `StatusBadge` gets a small `--live` dot with `animate-pulse`, disabled under `prefers-reduced-motion` (`motion-safe:`).

**Testing:**
- `lib/gherkin.ts` unit tests, covering every keyword, indentation, non-keyword lines, keyword-like words mid-line, and comments.
- Shell tests: icons and links, collapse toggling (`data-state="collapsed"`), the persisted cookie being written, and user menu → Sign out calling Clerk's `signOut`.
- A user-menu theme test (`setTheme` called with "dark").
- `notify` mocked to assert toasts on representative mutations (execution create, bug status change).
- `ErrorState` retry calls `refetch`.
- `vitest.setup.ts` gains a `matchMedia` polyfill, because `useIsMobile` and next-themes' system detection call it and jsdom lacks it.
- Plus a manual visual pass in both themes, and the production build.

## Risks / Trade-offs

- [The `(app)` layout reading cookies makes those routes dynamic] → Accepted: they're session-gated client screens already, and it's the shadcn-documented way to avoid a sidebar flash. Fallback if it causes build trouble: drop server-side `defaultOpen`, let the client restore from the cookie, and accept a one-frame flash.
- [shadcn `sidebar` generation against `radix-nova` + Next 16 is unverified] → Same posture as earlier `shadcn add` runs: typecheck right after generating, and hand-fix generated code if needed.
- [Contrast of semantic colors in dark mode] → Each token pair is checked during the visual pass; the values live in one file.
- [Moving Sign out into a menu changes a tested DOM path] → `sign-out-button.test.tsx` is ported to open the menu first. The spec's behavior is unchanged.
- [Two new runtime dependencies] → Both are shadcn's documented companions (next-themes for theming, sonner for toasts), small, and widely used. ADR 0011 already chose shadcn as the component approach.
