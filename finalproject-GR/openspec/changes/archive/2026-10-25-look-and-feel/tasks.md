# Tasks

## 1. Foundations

- [x] 1.1 Install `next-themes` and add shadcn primitives: `npx shadcn@latest add sidebar tooltip dropdown-menu avatar separator sonner` (from `apps/web`) — verify generated files exist, `npm run typecheck -w apps/web` passes; hand-fix generated code if it doesn't compile against `radix-nova`/Next 16 and note it
- [x] 1.2 `vitest.setup.ts`: add a `matchMedia` no-op polyfill (needed by `useIsMobile` and next-themes) — verify the full web suite still passes
- [x] 1.3 Theme tokens in `app/globals.css`: indigo `--primary`/`--ring`/`--sidebar-primary`/`--sidebar-ring` (light + dark), semantic `--pass --fail --review --pending --sev-critical --sev-high --sev-medium --sev-low --live` pairs exposed via `@theme inline`; add Geist Mono as `--font-mono` in `app/layout.tsx` — verify `next build` succeeds and a throwaway check renders `bg-pass`/`text-fail` with the token colors (dev server, both themes)
- [x] 1.4 Root layout: `ThemeProvider` (next-themes, `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`), `suppressHydrationWarning` on `<html>`, `<Toaster />`, Clerk `appearance` (indigo primary, Geist; dark variant without a new top-level dependency) — first confirm in `node_modules/next/dist/docs/` that a client provider in the root layout is still the documented pattern — verify no hydration warning in the dev console and the sign-in page uses the accent in both themes

## 2. Shell

- [x] 2.1 `lib/gherkin.ts` `splitKeyword(line)` — verify unit tests: each keyword (incl. `Scenario Outline`), indentation kept, keyword-like words mid-line not highlighted, `#` comments flagged, empty lines
- [x] 2.2 Rebuild `components/shell.tsx` on `SidebarProvider`/`Sidebar collapsible="icon"`: project name header, nav items with icons (`ListChecks`, `PlayCircle`, `Bug`) as `SidebarMenuButton asChild isActive tooltip` around `Link` keeping `aria-current="page"`, `SidebarTrigger` in a top bar, `SidebarInset` for content; `(app)/layout.tsx` reads the `sidebar_state` cookie and passes `defaultOpen`; access-denied/loading/error branches unchanged — verify `shell.test.tsx`: links + icons render, current link marked, trigger toggles `data-state` to `collapsed`, expanded/collapsed state written to the `sidebar_state` cookie, access-denied still hides nav
- [x] 2.3 `components/user-menu.tsx` in the sidebar footer: avatar initials + name from `useUser()`, Theme radio group (Light/Dark/System → `setTheme`), Sign out item reusing the existing sign-out handler; remove the standalone button from the shell — verify tests: choosing Dark calls `setTheme('dark')`; Sign out calls Clerk `signOut` and routes to `/sign-in` (port `sign-out-button.test.tsx`)

## 3. Shared presentation components

- [x] 3.1 `components/page-header.tsx` and `components/states/` (`ListSkeleton`, `DetailSkeleton`, `EmptyState`, `ErrorState` with Retry) — verify component tests: `ErrorState` Retry calls `onRetry`; `EmptyState` renders its action only when given
- [x] 3.2 `components/gherkin-view.tsx` (line numbers, keyword highlight, optional failed-step band with `aria-label="Failed step"`); replace `GherkinSnapshot` and the plain `<pre>` in `run-panel.tsx` and the Viewer branch of `test-case-detail.tsx` — verify tests: line numbers 1..n render; keywords carry the keyword class; existing failed-step and run-panel script assertions still pass
- [x] 3.3 `lib/notify.ts` (`notifySuccess`) and calls in mutation `onSuccess` for test case create/delete, execution create/update/delete/lifecycle, outcome recorded, bug file/update/delete/link, password reveal — verify tests (with `notify` mocked): creating an execution and changing a bug's status each notify once; a refused Sign Off notifies nothing and still shows the inline reason

## 4. Screens

- [x] 4.1 Semantic colors: `OUTCOME_COLORS`, `SEVERITY_COLORS`, `StatusBadge`/`BugStatusBadge` use the new token classes; In Progress badge gets a `motion-safe:animate-pulse` live dot — verify existing badge/list tests pass and a test asserts the live dot only on In Progress
- [x] 4.2 Test Cases screen: `PageHeader` (New test case as its action), split-pane layout (list left, detail/create right, prompt when nothing selected), shared states for list and detail — verify existing Test Cases tests pass unchanged in intent; new test: nothing selected shows the prompt; list load failure shows Retry
- [x] 4.3 Executions and Bugs screens: `PageHeader` with the New action, list/detail switched to shared skeleton/empty/error states (keeping "No executions yet." / "No bugs yet." titles) — verify existing screen tests pass; new tests: list load failure → Retry refetches on each screen

## 5. Verification

- [x] 5.1 Run `npm run lint`, `npm run typecheck`, `npm run test -w apps/web`, `npm run build -w apps/web` — verify all pass (routes under `(app)` may now be dynamic because of the sidebar cookie; that's expected)
- [x] 5.2 Manual visual pass (`npm run dev`) in light and dark: sidebar collapse/expand + reload keeps state, mobile width shows the sheet, tooltips when collapsed, user menu theme switch with no flash on reload, toasts on create/status change/delete, loading/empty/error states, Gherkin highlighting in run panel and bug detail, sign-in page themed — record anything that looks off
- [x] 5.3 roadmap-mvp.md Phase 9 Slice 1 Built / Key decisions / Deferred entry

## Workflow follow-up

- Archive with `/opsx:archive` once all tasks are done.
