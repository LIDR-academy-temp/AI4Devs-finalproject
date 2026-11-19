# T-05 App shell, navigation, and translations

**Issue:** [#31](https://github.com/ojordan0/AI4Devs-finalproject/issues/31) · **Ticket:** [docs/08-WORK-TICKETS.md, T-05](../../../docs/08-WORK-TICKETS.md#t-05-app-shell-navigation-and-translations) · **Branch:** `feat/t-05-app-shell`

**Covers:** Epic E-08. Stories: US-25 (main), US-07. Functional requirements: FR-08, FR-37, FR-38. Business rules: BR-11, BR-12, BR-13 (the shared "not available" state). Acceptance criteria: AC-99.

## Why

Every signed-in screen so far is a bare column: Lists links to Profile with a button, there is no way to reach the other tabs, and nothing tells a buyer from a member. T-10, T-12, T-13, T-08, and T-15 all build screens inside a frame that doesn't exist yet. T-05 builds that frame (header, navigation, and the shared empty, loading, and error states) in both languages, and adds date and number formatting by language, so later tickets only fill in their screens. D2 is due on November 19, 2026.

## What Changes

- **Navigation (FR-08, UX §2.2):** a bottom bar on phones and a left sidebar from 768 px, with icon and text tabs for Lists, People, Group, To buy, and My purchases, showing only the tabs the shared `visibleTabs` rule gives the user. The current tab is marked.
- **Header:** the group selector (or the group's name), **Refresh**, which reloads the current screen's data, and the user's avatar, which opens Profile.
- **Current group:** the member screens (Lists, People, Group) show one group, chosen in the group selector and remembered on the device; when nothing valid is remembered, the first group by name.
- **Main screen:** each user's starting screen is their first tab, or Profile when they have none. Welcome and One last step send an onboarded user there instead of always to Lists, and the "not available" state links back to it.
- **Tab screens not built yet:** People, Group, To buy, and My purchases get placeholder pages, each replaced by the ticket that builds the screen. A tab's address opened by a user who doesn't have that tab shows "This page isn't available" (BR-13).
- **Shared states (UX §2.1, §2.7):** components for empty states with guidance, loading skeletons, errors with a way out, the "not available" state, and the "not in any group yet" notice (BR-11), which the shell shows above every screen for a user with no group. Later screens reuse them. Loading and error states inside the shell keep the header and navigation visible.
- **Formatting (FR-38):** date and number formats per language, on the next-intl setup from T-04, used through next-intl's formatter.
- **Layout:** mobile first from 360 px with no horizontal scrolling; from 768 px the sidebar, with content centered up to 640 px.
- **shadcn/ui components** the shell needs: dropdown menu (group selector) and skeleton.
- **Documents updated first**, because reviewing this ticket found gaps:
  - **What the group selector selects, and when it appears.** UX §2.2 says it appears for a user in more than one group, but not what it changes. To buy and My purchases already cover all the user's groups, with their own filters (UX §2.3). *Proposed:* the selector chooses the group for Lists, People, and Group; it lists the groups the user is a member of, and appears when there are two or more. A user who is a member of one group and a buyer in another sees that group's name, with no selector. The choice is remembered on the device (UX §2.2).
  - **Where a user lands.** Flow A ends on Lists and flow C sends a buyer to To buy, but nothing defines the main screen that the "not available" state returns to, or where a user with no tabs lands. *Proposed:* the first visible tab, or Profile when there is none, with the "not in any group yet" notice above it (UX §2.2, §2.7).
  - **The avatar.** The page security policy allows images only from the app itself, so the Google profile photo can't be shown without widening it. *Proposed:* the avatar shows the user's initials (UX §2.2).
  - **Spanish text for the shell.** UX §2.10 has no entry for Refresh or the group selector. *Proposed:* add them.
  - **Placeholders for tabs not built yet.** *Proposed:* T-05 adds them, and the tickets that build People, Group, To buy, and My purchases replace them (Work tickets, T-08, T-12, T-13).

## Capabilities

### New Capabilities

- `app-shell`: the header, group selector, Refresh, avatar, tab navigation, current group, main screen, responsive layout, and the placeholder tab screens.
- `screen-states`: the shared empty, loading, error, "not available", and "not in any group yet" states.

### Modified Capabilities

- `developer-environment`: the translation requirement also covers date and number formatting by language (FR-38), and gains the AC-99 scenario for it.
- `onboarding`: an onboarded user is sent from Welcome and One last step to their main screen, not always to Lists.

## Non-goals

| Left out | Owner |
| --- | --- |
| The Lists screen, its list switcher, filters, and the floating **+ Add** button | T-10 |
| People, Group, To buy, and My purchases screens (placeholders only here) | T-13, T-08, T-12 |
| Desktop list and item side by side | T-10 |
| **Create a group** in the "not in any group yet" state and in Profile (AC-22, AC-32) | Milestone 2 (FR-05) |
| Time zones for timestamps; T-05 formats calendar dates, which carry none, and no shell screen shows a time | T-14, which first shows timestamps (the item timeline) |
| Returning to the same screen with typed text after the session expires (AC-07) | Milestone 2 |
| Bottom sheets and dialogs | The tickets that first use them (T-12, T-16) |
| AC-99 for each screen other than the shell and Profile | Each screen's ticket adds its own AC-99 browser test |

## Impact

- **Pages (existing):** `src/app/(app)/layout.tsx` (renders the shell), `src/app/(app)/lists/page.tsx` (drops its own header and Profile button, uses the current group), `src/app/(public)/page.tsx` and `src/app/(public)/onboarding/page.tsx` (send an onboarded user to their main screen).
- **Pages (new):** placeholders at `src/app/(app)/people/page.tsx`, `src/app/(app)/group/page.tsx`, `src/app/(app)/to-buy/page.tsx`, and `src/app/(app)/purchases/page.tsx` (addresses from Architecture §2); `src/app/(app)/loading.tsx`, `src/app/(app)/error.tsx`, and `src/app/(app)/not-found.tsx` inside the shell; `src/app/not-found.tsx` for addresses that don't exist; and `src/app/main-screen.ts`, which Welcome and One last step use to find the main screen.
- **Components (new):** `src/components/app-shell/` (header, group selector, Refresh button, avatar, tab navigation), `src/components/screen-states.tsx` (empty, "not available", and "not in any group yet" states) and `src/components/screen-error.tsx` (the error state), and `src/components/ui/dropdown-menu.tsx` and `src/components/ui/skeleton.tsx` from shadcn/ui.
- **Shared code (existing):** `src/shared/navigation.ts` gains each tab's address, the main screen, the current-group choice, and the cookie name for the remembered group.
- **Translations (existing):** `src/i18n/en.json` and `es.json` (shell, tab names, placeholder and state text); `src/i18n/request.ts` gains the date and number formats and the time zone; a new `src/i18n/formats.ts` holds the formats.
- **Endpoints and tables:** none changed. The shell reads the user through `getCurrentUser` in `src/server/services/me.ts` (existing), the same data as `GET /me`. No migration, and `docs/openapi.yaml` doesn't change.
- **Tests:** `tests/unit/navigation.test.ts` (existing), a new `tests/unit/formats.test.ts`, a new `tests/e2e/app-shell.spec.ts`, and `tests/e2e/support.ts` (existing) gains a helper that adds a membership in the test database, reusing `tests/support/factories.ts`.
- **Changed documents:** `docs/02-UX-DESIGN.md` (§2.2, §2.7, §2.10) and `docs/08-WORK-TICKETS.md` (T-08, T-12, T-13).
- **Dependencies:** none added; the shadcn/ui components use `radix-ui`, already installed (Architecture §1.6).
