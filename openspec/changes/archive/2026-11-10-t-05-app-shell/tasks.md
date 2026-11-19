# Tasks

T-05's acceptance criterion is AC-99 (tasks 2.3 and 5.7). The other scenarios are named after the rule they verify or after the ticket, as [Security and testing §2.6](../../../docs/07-SECURITY-AND-TESTING.md#26-coverage-targets) describes. Of the definition of done, the items in scope are lint and type checks (group 7; no endpoint changes, so `docs/openapi.yaml` stays as it is), interface text in Spanish and English (task 3.1), and the owning documents (group 1).

## 1. Documents first

- [x] 1.1 Update `docs/02-UX-DESIGN.md` §2.2: the group selector lists the groups the user is a member of and appears when there are two or more, it chooses the group for Lists, People, and Group, and the choice is remembered on the device; with one member group the header shows its name, and with none the app name; the avatar shows the user's initials; the main screen is the first tab, or Profile when there is none. Update the header. Verify that no rule text from the PRD is copied.
- [x] 1.2 Update `docs/02-UX-DESIGN.md` §2.7, "No groups": the notice appears above every screen, and the main screen is My purchases when the user has purchases to ship, Profile otherwise. Add to §2.10 the English and Spanish for Refresh, the group selector's label, the "not available" button, and Loading.
- [x] 1.3 Update `docs/08-WORK-TICKETS.md`: T-08, T-12, and T-13 replace the T-05 placeholders at `/group`, `/to-buy` and `/purchases`, and `/people`. Update the header.
- [x] 1.4 Run `npm run check:links`. Verify that it passes.

## 2. Shared navigation rules and formats

- [x] 2.1 Add `TAB_PATHS`, `mainScreenPath(tabs)`, `CURRENT_GROUP_COOKIE`, and `chooseCurrentGroup(memberGroups, remembered)` to `src/shared/navigation.ts` (design decisions 3 and 4). Add to `tests/unit/navigation.test.ts` the tests `FR-08 the main screen follows the tabs` and `BR-12 a remembered group the user no longer belongs to is ignored` (also covering a valid remembered group and a user with no member group). Verify that they pass.
- [x] 2.2 Add `src/i18n/formats.ts` with the `short` and `long` date formats, the `integer` number format, `TIME_ZONE`, and `calendarDate(value)`; return `formats` and `timeZone` from `src/i18n/request.ts` (design decision 8). Verify with `npx tsc --noEmit` and `npm run build` with no next-intl time zone warning.
- [x] 2.3 Write `tests/unit/formats.test.ts` with `AC-99 dates and numbers use the English format`, `FR-38 dates and numbers use the Spanish format`, and `FR-38 a calendar date shows the same day everywhere` (formatting with `TZ` set to a zone west and east of UTC). Verify that they pass.

## 3. Translations and components

- [x] 3.1 Add the `shell`, `tabs`, `states`, and `placeholder` messages to `src/i18n/en.json` and `es.json`, using the UX §2.10 strings; move `notInGroup` and `askForInvitation` from `lists` to `states`, and remove `lists.profile`. Verify with the existing `tests/unit/translations.test.ts`.
- [x] 3.2 Add `src/components/ui/dropdown-menu.tsx` and `src/components/ui/skeleton.tsx` with the shadcn command, styled to DESIGN.md (48 px items, 16 px text, focus ring, `popover` tokens). Verify with `npm run lint` and `npx tsc --noEmit`.
- [x] 3.3 Add `src/components/screen-states.tsx` with `EmptyState`, `NotAvailable`, and `NoGroupNotice`, and `src/components/screen-error.tsx` with `ScreenError` (design decision 5), with all text from the message files and icons marked `aria-hidden`. Verify with `npm run lint` and `npx tsc --noEmit`.

## 4. The shell

- [x] 4.1 Add `src/app/(app)/shell-data.ts` with `loadShell()` (cached per request: the user, tabs, member groups, current group from the `group` cookie, main screen) and `requireTab(tab)` (design decisions 1 and 4). Verify with `npx tsc --noEmit`.
- [x] 4.2 Add `src/components/app-shell/`: `app-shell.tsx` (header, skip link, content column, `NoGroupNotice` for a user with no memberships), `tab-nav.tsx` (one `<nav>`, bottom bar below 768 px and sidebar from 768 px, `aria-current`), `group-selector.tsx` (dropdown with the member groups, writes the cookie, refreshes; plain name for one group; app name for none), `refresh-button.tsx` (`router.refresh()` in a transition, busy state), and `user-avatar.tsx` (initials, link to Profile) (design decisions 2, 3, and 7). Verify with `npm run lint` and `npx tsc --noEmit`.
- [x] 4.3 Render the shell from `src/app/(app)/layout.tsx` with `loadShell()`. Change `src/app/(app)/lists/page.tsx` to call `requireTab("lists")`, drop its header and Profile button, and show the current group's first list; change `src/app/(app)/profile/page.tsx` to read the user through `loadShell()`. Verify by running `npm run dev` and opening Lists and Profile at 360 px and 1280 px wide.
- [x] 4.4 Add `src/app/(app)/loading.tsx` (skeletons in a status region), `src/app/(app)/error.tsx` (`ScreenError`, refresh then reset), `src/app/(app)/not-found.tsx` (`NotAvailable` to the main screen), and `src/app/not-found.tsx` (`NotAvailable` to `/`). Verify with `npm run build`.
- [x] 4.5 Add the placeholder pages `src/app/(app)/people/page.tsx`, `group/page.tsx`, `to-buy/page.tsx`, and `purchases/page.tsx`, each with `requireTab`, a translated title, and a shared `PlaceholderScreen` built on `EmptyState` (design decision 6). Verify with `npm run build`.
- [x] 4.6 Send an onboarded user from `src/app/(public)/page.tsx` and `src/app/(public)/onboarding/page.tsx` to `mainScreenPath` of their tabs. Verify that the existing onboarding browser tests still pass.

## 5. Browser tests

- [x] 5.1 Add to `tests/e2e/support.ts` `signInAsSeedUser(page, name)` and `addMemberGroup(email, groupName)`, the latter inserting the group and membership in the test database with Drizzle (design decision 9). Verify with `npx tsc --noEmit`.
- [x] 5.2 In `tests/e2e/app-shell.spec.ts`, write `FR-08 a member who doesn't buy sees Lists, People, and Group`, `AC-24 a user who is only a buyer sees only To buy and My purchases`, `FR-08 a member in one group and buyer in another sees every tab`, and `FR-08 choosing a tab opens its screen`. Verify that they pass.
- [x] 5.3 Write `T-05 the shell fits a 360 px wide screen` and `T-05 desktop shows the sidebar`. Verify that they pass in Chromium and WebKit.
- [x] 5.4 Write `T-05 the avatar opens Profile`, `T-05 a buyer with no member group sees the app name`, and `T-05 Refresh shows data changed elsewhere`. Verify that they pass.
- [x] 5.5 Write `T-05 a member of two groups switches between them`, `T-05 a member of one group sees its name with no selector`, `FR-08 a buyer group isn't offered in the selector`, and `T-05 the chosen group is kept after reloading`. Verify that they pass.
- [x] 5.6 Write `BR-13 a member who doesn't buy opens To buy`, `BR-13 a user who is only a buyer opens Lists`, `BR-13 a missing address shows "not available"`, `BR-11 the former buyer sees the notice and My purchases`, `T-05 a placeholder screen uses the empty state`, `T-05 a loading screen shows skeletons inside the shell`, and, in `tests/e2e/onboarding.spec.ts`, `FR-08 a user who is only a buyer lands on To buy`. Verify that they pass.
- [x] 5.7 Write `AC-99 the shell in English`, `FR-37 the shell in Spanish`, `T-05 the shell has no accessibility violations` (Lists, People, and the open group selector, in both languages), and `T-05 the shell can be used with the keyboard`. Verify that they pass.
- [x] 5.8 Update any existing browser test that relied on the Lists placeholder's Profile button or header (`tests/e2e/welcome.spec.ts`, `onboarding.spec.ts`, `profile.spec.ts`). Verify that `npm run test:e2e` passes in full.

## 6. Manual check

- [x] 6.1 Check "T-05 a failed screen can be tried again" by hand: on a local production build against the test database, make the People placeholder throw while a flag file exists, open it, confirm the error state with Try again inside the shell, remove the flag, and confirm Try again loads it. Record the steps and result for the pull request description; leave no change in the code.

## 7. Integration checks

- [x] 7.1 Run `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run test:e2e`. Verify that all pass.
- [x] 7.2 Run `openspec validate t-05-app-shell --strict`. Verify that it passes.

## Workflow follow-up

- Open the pull request when the user asks, run the adversarial review, and archive the change before the merge (CLAUDE.md, "Finishing a ticket").
