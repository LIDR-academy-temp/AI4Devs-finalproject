# Design

## Context

- `src/app/(app)/layout.tsx` checks the user with `requireOnboardedUser()` and renders a bare 640 px column. Lists (a T-04 placeholder) has its own header with a Profile button; Profile has none.
- `src/shared/navigation.ts` already has `visibleTabs({ memberships, hasPurchases })`, unit-tested, and `getCurrentUser(db, userId)` returns exactly that input plus each membership's group name and role (T-07). `listGroups` orders groups by name.
- next-intl is set up in `src/i18n/request.ts` with messages only: no formats and no time zone. `NextIntlClientProvider` in the root layout inherits the request configuration.
- The page Content Security Policy allows images only from the app's own origin (`img-src 'self' data: blob:`).
- Welcome and One last step send an onboarded user to `/lists`.
- shadcn/ui is configured (`components.json`); `button`, `checkbox`, `input`, `label`, and `switch` are in `src/components/ui`.
- Browser tests run a production build against the test database, on Pixel 7 (Chromium) and iPhone 15 (WebKit) screens; `tests/e2e/support.ts` signs in through the development sign-in and runs axe. The seed has Juan (only a buyer), Luis (owns Pérez Group, buyer in García Group), and Pedro (former buyer with a purchased item).
- See proposal.md for why, and the specs for the required behavior.

## Goals / Non-Goals

**Goals:**

- One server-side read of the user per request, shared by the layout and the page.
- One navigation element that is a bottom bar on phones and a sidebar on desktop, so screen readers find one navigation landmark.
- Shell decisions (tab addresses, main screen, current group) as pure functions in `src/shared/navigation.ts`, unit-tested next to `visibleTabs`.

**Non-Goals:**

- No new endpoint, table, or column. The current group isn't stored on the server.
- No component tests (Security and testing §2.2): the shell is verified by browser tests, the pure functions by unit tests.
- No time-of-day formatting or time zone choice for timestamps (Open questions).

## Decisions

### 1. The layout reads the user once and renders the shell

A request-scoped loader, `loadShell()` in `src/app/(app)/shell-data.ts`, wraps `requireOnboardedUser()` and `getCurrentUser(db, user.id)` in React's `cache()`, then derives the tabs (`visibleTabs`), the member groups, the current group (decision 3), and the main screen (decision 4). The layout and each page call it; within a request it runs once. It replaces the direct calls in the Lists and Profile pages.

The layout renders `AppShell` (`src/components/app-shell/app-shell.tsx`, a server component) with the shell data. Only the parts that need the browser are client components: the tab links (they read `usePathname()` to mark the current tab, because layouts don't re-render on client navigation), the group selector, and Refresh.

*Alternatives:* fetching `GET /me` from the browser. Rejected: a loading flash on every screen and a second round trip for data the server already has. Passing the data down through props from the layout to pages isn't possible in the App Router; `cache()` is the documented way to share it.

### 2. One navigation element, restyled by width

`TabNav` renders one `<nav>` with a translated label. Below `md` (768 px) it is fixed to the bottom, at least 64 px tall plus the device's bottom safe area, with tabs sharing the width equally; tab names may wrap to two lines and hyphenate in the page's language, because "Personas", "Por comprar", and "Mis compras" don't fit one line at 16 px in a fifth of 360 px. From `md` it is a fixed left sidebar, 272 px wide, with the app name above the tabs. The current tab gets `aria-current="page"` and the primary color with a filled indicator, so color isn't the only cue.

The content column keeps the 640 px maximum, centered in the space next to the sidebar, and has bottom padding equal to the bar's height on phones so nothing hides behind it. The header is sticky at the top of the content area, with the level 2 shadow (DESIGN.md). A "Skip to content" link is the first focusable element.

Icons (`lucide-react`): Lists `ListChecks`, People `Users`, Group `House`, To buy `ShoppingCart`, My purchases `ShoppingBag`.

*Alternatives:* two navigation elements, one hidden per width. Rejected: duplicate landmarks and tab stops if a class is ever wrong, and twice the markup to keep in sync.

### 3. The current group lives in a cookie, checked against memberships

The group selector writes the chosen group's ID to the `group` cookie (`CURRENT_GROUP_COOKIE` in `src/shared/navigation.ts`), with `Path=/`, `SameSite=Lax`, and a one-year lifetime, then calls `router.refresh()`. `chooseCurrentGroup(memberGroups, remembered)` returns the remembered group when the user is currently a member of it, and otherwise the first member group by name, or none. A tampered or stale cookie therefore never grants anything (BR-12): the services still check every request.

The selector is a shadcn/ui `DropdownMenu` with a radio group of the member groups, opened by a button showing the current group's name and a chevron, at least 48 px tall. The menu is not modal: a modal menu hides the rest of the page from screen readers while its controls stay focusable, which the automated accessibility checks report (`aria-hidden-focus`). The group name wraps to two lines, breaking only between words, before it is cut short.

*Alternatives:* the group in the address (`/groups/{groupId}/lists`). Rejected for now: it would fix T-10's addresses before T-10 is designed, and the list links in WhatsApp messages (flow D) already identify their group through the list. A `users.current_group_id` column with a `PATCH /me` field. Rejected: a migration and an API change for something the docs don't ask to follow the user across devices. Both remain possible later without changing the specs' observable behavior on one device.

### 4. Tab addresses and the main screen are shared constants

`TAB_PATHS` maps each tab to its address from Architecture §2: `/lists`, `/people`, `/group`, `/to-buy`, `/purchases`. `mainScreenPath(tabs)` returns the first tab's address, or `/profile` when there is none. Welcome and One last step redirect an onboarded user to it, reading the tabs through `getCurrentUser`; the One last step form's own redirect after completing onboarding stays `/lists`, because getting started always makes the user a member (BR-06).

`requireTab(tab)` in `src/app/(app)/shell-data.ts` calls `notFound()` when the user doesn't have the tab. Every tab page, including Lists, calls it, so the "not available" state renders from `src/app/(app)/not-found.tsx`, inside the shell. Addresses that match no route use a new root `src/app/not-found.tsx`, outside the shell; its button goes to `/`, which sends a signed-in user to their main screen and anyone else to Welcome.

### 5. Shared states are plain components in `src/components/screen-states.tsx`

The states that render on the server are in `screen-states.tsx`; `ScreenError`, which needs a click handler, is a client component in `src/components/screen-error.tsx`, so the server states can take an icon component as a prop.

- `EmptyState`: icon, message, optional action. Used by the placeholder screens.
- `NotAvailable`: the `NOT_AVAILABLE` message from the `errors` namespace and a button to the main screen.
- `ScreenError`: the error message and Try again. `src/app/(app)/error.tsx` uses it, calling `router.refresh()` and then the boundary's `reset()` in one transition, so Try again fetches the server data again instead of re-rendering the failed result. The root `src/app/error.tsx` stays for failures outside the shell, such as the layout itself.
- `NoGroupNotice`: "You're not in any group yet." and "Ask someone to invite you.", moved from the Lists placeholder's messages. The shell renders it above the page for a user with no memberships.
- `src/app/(app)/loading.tsx`: card-shaped `Skeleton` blocks (shadcn/ui) in a `role="status"` region with a visually hidden "Loading…" label.

### 6. Placeholder screens share one component

`PlaceholderScreen` renders the tab's name as the page heading and an `EmptyState` with one shared "on its way" message. Each of `people`, `group`, `to-buy`, and `purchases` is a three-line page: `requireTab`, the metadata title, and the placeholder. The tickets that build them replace the page file (T-13, T-08, T-12). The Lists placeholder keeps its T-04 content, minus its header and Profile button, and shows the current group's first list.

### 7. The avatar shows initials and links to Profile

`UserAvatar` renders a 48 px circle with up to two initials from the user's name (the first letter of the first two words), or the first letter of their email when there is no name, as a link to `/profile` whose accessible name is the translated "Profile". The Google photo URL in `users.image` is not loaded: the page policy allows images only from the app's origin, and loading it would also tell Google each time a user opens the app.

*Alternatives:* add `lh3.googleusercontent.com` to `img-src`. Rejected for the MVP: a policy change for decoration, and the address can change with Google's CDN.

### 8. Formats live next to the messages

`src/i18n/formats.ts` exports next-intl `formats`: `dateTime.short` (day, month, and year as numbers), `dateTime.long` (day, month name, year), and `number.integer`, plus `TIME_ZONE = "UTC"`. `request.ts` returns them with the messages, so server and client components format the same way through `getFormatter()` and `useFormatter()`, and next-intl doesn't warn about a missing time zone.

Calendar dates (Postgres `date` columns, such as `shipments.ship_date`) arrive as `YYYY-MM-DD` strings. `calendarDate(value)` turns one into the UTC midnight of that day; formatted in UTC, it shows the same day in every browser.

The unit test builds a formatter with next-intl's `createFormatter` and the same formats for each language, so it checks the configuration the app uses.

### 9. Browser tests

A new `tests/e2e/app-shell.spec.ts` covers the app-shell and screen-states scenarios. Additions to `tests/e2e/support.ts`:

- `signInAsSeedUser(page, name)` signs in as `juan`, `luis`, or `pedro` `@example.com` through the development sign-in. These scenarios only read, so the seed users stay as they are (Security and testing §2.3).
- `addMemberGroup(email, name)` opens a connection to the test database and inserts the group and the membership with Drizzle, because no milestone 1 endpoint creates a second group for a user. It doesn't reuse `tests/support/factories.ts`, which imports Vitest's `expect` and can't load in Playwright.
- The loading scenario delays the browser's React Server Components request (identified by its `RSC` header) with Playwright's request routing, so the skeleton is visible for a known time.
- The 360 px scenario sets the viewport and checks that the document's scroll width equals its client width.
- Screens in the shell stream in after it (the `loading.tsx` boundary), so a form can be on screen before the browser has made it interactive. Tests that type or click right after opening a screen wait for the network to go idle first; this applies to the existing Profile tests too.
- The keyboard scenario runs in Chromium only: WebKit, like Safari, moves focus to links only with Option-Tab.

## Risks / Trade-offs

- [Five tabs at 360 px are tight] → Equal-width tabs with names that hyphenate onto two lines; browser tests check the 48 px targets and the absence of horizontal scrolling, with three tabs and with five.
- [Refresh's label plus a long group name may not fit at 360 px] → The group name truncates first; Refresh keeps its visible label, because DESIGN.md allows no icon-only controls. The avatar is the one exception, as UX §2.2 defines it.
- [The remembered group is per device] → A user on two devices may see different groups until they choose; the selector is one tap away.
- [Delaying the RSC request depends on Next.js's request header] → If it changes, the loading test fails loudly rather than passing falsely, since it asserts the skeleton is visible.
- [Error state checked by hand] → Recorded in the pull request, as Security and testing §2.6 allows; T-17 can automate it if a test hook is ever added.

## Migration Plan

No data or configuration changes. Deploying is the normal merge; rolling back is reverting the pull request. A stale `group` cookie after rollback is ignored, since nothing reads it.

## Open Questions

- Which time zone timestamps are shown in (for example, the item timeline in T-14). The shell shows none, and calendar dates don't depend on it. T-14 decides, either the viewer's browser time zone or a fixed one, by changing `TIME_ZONE` or passing a zone where it formats.
