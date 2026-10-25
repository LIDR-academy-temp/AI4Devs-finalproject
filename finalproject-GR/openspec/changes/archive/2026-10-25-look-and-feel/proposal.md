# Proposal

## Why

Phases 6–8 delivered every MVP journey up to bugs, but manual testing showed the UI is still a functional scaffold: shadcn's default grayscale theme, a plain fixed sidebar of text links, no feedback after actions beyond inline errors, inconsistent page layouts (Test Cases is a stacked list, Executions and Bugs are split panes), and loading, empty and error states that differ per screen. The goal is a UI "closer to end-use ready" before the remaining Phase 9 slices (folder tree, drag-and-drop ordering) build more screens on top of it.

This is roadmap-mvp.md **Phase 9, Slice 1: Look & feel**. It changes presentation and shell behavior only: no API, no data, no new domain features. The visual direction was decided on 2026-10-25: neutral and dense with one electric-indigo accent, semantic outcome colors, Geist fonts, light and dark mode, and a collapsible sidebar with an icon per item.

## What Changes

- **Theme:**
  - Replace shadcn's grayscale primary with an **electric indigo accent** in light and dark, as CSS tokens in `app/globals.css`.
  - Add **semantic tokens** used everywhere a state is shown:
    - run outcomes: pass, fail, needs review, pending;
    - bug severities: critical, high, medium, low;
    - a "live" accent for In Progress executions.
  - Add **Geist Mono** for scripts, timers and IDs, alongside the existing Geist Sans.
  - Clerk's sign-in and sign-up pages adopt the same accent and theme.
- **Dark mode:** a Light / Dark / System choice in the user menu, remembered per browser, applied before first paint so pages never flash the wrong theme.
- **Sidebar (PRD §5):**
  - Collapses to an **icon rail**; the state is remembered across visits.
  - Each item has its own **icon**: Test Cases, Executions, Bugs.
  - Collapsed items show **tooltips**, and the current screen stays highlighted.
  - On narrow screens the sidebar becomes a slide-over sheet.
  - The project name sits at the top.
  - A **user menu** at the bottom shows the signed-in user and holds the theme choice and Sign out. Sign out stays reachable, as the existing spec requires.
- **Page chrome:**
  - Every screen gets the same **page header**: title, short description, and primary action.
  - The **Test Cases screen moves to the split-pane layout** the PRD describes (§6.2.1) and the other screens already use. Its list, detail and create behavior is unchanged.
- **Feedback:** **toast notifications** confirm successful actions (created, saved, status changed, deleted, revealed). Refusals and errors keep their inline explanations from `ActionError`.
- **States:** shared **loading** (skeletons), **empty** (icon, message, call to action for those allowed) and **error** (message and retry) components, used by every list and detail on the three screens.
- **Gherkin display:** read-only scripts get **line numbers** and **keyword highlighting** for Feature, Scenario, Given, When, Then, And, But. This covers the run panel, bug snapshot and Viewer test-case view. The failed-step highlight on bugs keeps its red band.
- **Consistency pass:** status badges, outcome dots and severity dots all draw from the semantic tokens. In Progress gets a subtle "live" pulse.

**Explicitly deferred (recorded, not silently omitted):**
- Resizable split panes.
- Syntax highlighting *inside* the editable Gherkin textarea (it needs a code-editor component).
- Workspace and project switchers (only one workspace and project exist per user in the MVP).
- PRD §5 links to screens that don't exist yet (Overview, Activity, Settings, Members, Trash).
- Mobile-specific layouts beyond the sidebar sheet.
- Visual regression testing.

## Capabilities

### New Capabilities
- `web-ui-foundation`: cross-screen presentation behavior: theme preference (light, dark, system) and its persistence, success notifications, the shared loading/empty/error states, and how Gherkin scripts are displayed.

### Modified Capabilities
- `web-app-shell`:
  - The navigation requirement now includes icons, a collapsible sidebar whose state is remembered, and its mobile form.
  - Sign out moves into a user menu. The requirement that a signed-in user can sign out is unchanged in substance, and its existing scenarios still hold.

## Impact

- **Web (`apps/web`) only.**
  - `app/globals.css` gets the theme tokens; `app/layout.tsx` gets the theme provider, Geist Mono and the toaster; Clerk appearance is set in `ClerkProvider`.
  - `components/shell.tsx` is rebuilt on shadcn's `sidebar` primitive, plus a new `components/user-menu.tsx`.
  - New `components/page-header.tsx`, `components/states/*`, `components/gherkin-view.tsx`.
  - Existing screens are restyled: Test Cases moves to split panes, and the badges and dots switch to tokens.
- **New dependencies:** `next-themes` (theme persistence without a flash; shadcn's documented approach) and `sonner` (shadcn's toast component). Plus shadcn-generated files for `sidebar`, `tooltip`, `dropdown-menu`, `avatar`, `separator`, `sonner`, and the `use-mobile` hook.
- **API, DB, specs of other capabilities:** none.
- **Docs:** roadmap-mvp.md Phase 9 Slice 1 entry. The theme decisions live in this change's design.md (ADR 0011 already chose the stack, and this only configures it).
