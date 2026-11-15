# Screens and Stitch folders

**Assisted Shopping Platform: ComproParaTi** · **Version:** 1.0 · **Date:** November 14, 2026

Part of the project documentation ([readme](../readme.md)). Maps each screen in [UX §2.3](../docs/02-UX-DESIGN.md#23-screens), and each state the code builds, to its route, its components, its Stitch folder in [design/stitch/](stitch/), and its tickets in [Work tickets](../docs/08-WORK-TICKETS.md#3-ticket-overview). How to use the Stitch folders, and the differences to ignore in each, are in [DESIGN.md, Using the Stitch Screens](../DESIGN.md#using-the-stitch-screens).

---

## Columns

- **Route:** the address in `src/app`. "—" when the code has no route for the screen and [Architecture §2](../docs/03-ARCHITECTURE.md#2-project-structure) names none.
- **Component:** the page file and the components that lay out the screen. "—" when the code has no screen.
- **Stitch folder:** the folder in `design/stitch/`, or "None".
- **Tickets:** the D2 tickets that built the screen, then "→" and its design ticket. "—" before the arrow when no D2 ticket built it; "unmatched" after it when no design ticket names the screen or state. A file no archived proposal names is credited to the ticket whose commit added it.
- **Fit:** compares only the parts the code builds. Sections that a later ticket adds, such as the person's details on the item page, don't count.
  - **Reskin:** the structure roughly matches the Stitch screen; only styling differs.
  - **Restructure:** the layout differs a lot from the Stitch screen.
  - **No Stitch design:** the screen or state exists, but Stitch has no design for it.
  - **Not built:** UX defines the screen, but the code has no screen for it. A screen with neither code nor a Stitch design is Not built.
- **Status:** Placeholder on every row.

## Screens

| Screen | Route | Component | Stitch folder | Tickets | Fit | Status |
|---|---|---|---|---|---|---|
| 1 Welcome | `/` | `src/app/(public)/page.tsx`, `src/app/(public)/welcome-actions.tsx`, `src/app/(public)/welcome-language.tsx` | `01-welcome` | T-04 → T-21 | Reskin | Placeholder |
| 2 One last step | `/onboarding` | `src/app/(public)/onboarding/page.tsx`, `src/app/(public)/onboarding/onboarding-form.tsx` | `02-one-last-step` | T-04 → T-22 | Reskin | Placeholder |
| 3 Invitation | — | — | `03-invitation` | — → T-23 | Not built | Placeholder |
| 4 Lists | `/lists` | `src/app/(app)/lists/page.tsx`, `src/components/lists/list-column.tsx`, `list-menu.tsx`, `quick-add.tsx`, `item-filters.tsx`, `item-card.tsx`, `status-chip.tsx` | `04-lists` | T-10 → T-24 | Reskin | Placeholder |
| 5 Add item | `/items/new` | `src/app/(app)/items/new/page.tsx`, `src/components/lists/item-form-screen.tsx`, `item-form.tsx`, `character-count.tsx` | `05-item-form` | T-10 → T-25 | Reskin | Placeholder |
| 5 Edit item | `/items/[itemId]/edit` | `src/app/(app)/items/[itemId]/edit/page.tsx`, `src/components/lists/item-form-screen.tsx`, `item-form.tsx`, `character-count.tsx` | `05-item-form` | T-10 → T-25 | Reskin | Placeholder |
| 6 Item page | `/items/[itemId]` | `src/app/(app)/items/[itemId]/page.tsx`, `src/components/lists/item-page.tsx`, `item-actions.tsx` | `06-item-page` | T-10 → T-26 | Restructure | Placeholder |
| 7 People (list) | `/people` | — (shows `src/app/(app)/placeholder-screen.tsx`) | `07-person-list` | — → T-27 | Not built | Placeholder |
| 7 People (person page) | — | — | `07-person-detail` | — → T-27 | Not built | Placeholder |
| 8 Group | `/group` | — (shows `src/app/(app)/placeholder-screen.tsx`) | `08-group` | — → T-28 | Not built | Placeholder |
| 8 Group: address form | — | — | None | — → T-33 | Not built | Placeholder |
| 9 To buy | `/to-buy` | — (shows `src/app/(app)/placeholder-screen.tsx`) | `09-to-buy` | — → T-29 | Not built | Placeholder |
| 10 My purchases | `/purchases` | — (shows `src/app/(app)/placeholder-screen.tsx`) | `10-my-purchases` | — → T-30 | Not built | Placeholder |
| 11 Mark as shipped | — | — | `11-mark-as-shipped` | — → T-31 | Not built | Placeholder |
| 6 Item page: "No lo pude comprar" sheet | — | — | None | — → T-33 | Not built | Placeholder |
| 12 Profile | `/profile` | `src/app/(app)/profile/page.tsx`, `src/app/(app)/profile/profile-form.tsx` | `12-profile` | T-04 → T-32 | Reskin | Placeholder |

## States

| Screen | Route | Component | Stitch folder | Tickets | Fit | Status |
|---|---|---|---|---|---|---|
| Loading, in the shell | Any route in `src/app/(app)` | `src/app/(app)/loading.tsx` | None | T-05 → T-33 | No Stitch design | Placeholder |
| Loading, Lists | `/lists` | `src/app/(app)/lists/loading.tsx` | None | T-10 → unmatched | No Stitch design | Placeholder |
| Loading, item page | `/items/[itemId]` | `src/app/(app)/items/[itemId]/loading.tsx` | None | T-10 → unmatched | No Stitch design | Placeholder |
| Error, in the shell | Any route in `src/app/(app)` | `src/app/(app)/error.tsx`, `src/components/screen-error.tsx` | None | T-05 → T-33 | No Stitch design | Placeholder |
| Error, outside the shell | Any route | `src/app/error.tsx` | None | T-04 → T-33 | No Stitch design | Placeholder |
| Not available, in the shell (BR-13) | Any route in `src/app/(app)` | `src/app/(app)/not-found.tsx`, `NotAvailable` in `src/components/screen-states.tsx` | None | T-05 → T-33 | No Stitch design | Placeholder |
| Not available, unknown address | Any unknown route | `src/app/not-found.tsx`, `NotAvailable` in `src/components/screen-states.tsx` | None | T-05 → T-33 | No Stitch design | Placeholder |
| Not in any group yet | Every route in `src/app/(app)` | `NoGroupNotice` in `src/components/screen-states.tsx`, rendered by `src/components/app-shell/app-shell.tsx` | None | T-05 → T-33 | No Stitch design | Placeholder |
| Empty: no lists, no items, choose an item | `/lists` | `src/app/(app)/lists/page.tsx`, `src/components/lists/list-column.tsx`, `EmptyState` in `src/components/screen-states.tsx` | None | T-10 → unmatched | No Stitch design | Placeholder |
| New list dialog | `/lists` | `src/components/lists/new-list-dialog.tsx` | None | T-10 → unmatched | No Stitch design | Placeholder |
| Delete item confirmation | `/items/[itemId]` | `src/components/lists/item-actions.tsx` | None | T-10 → unmatched | No Stitch design | Placeholder |

## Not matched

- **States built in T-10:** the Lists and item page loading states, the Lists empty states, the New list dialog, and the delete item confirmation, all with no Stitch design. T-33 names only the address form, the "No lo pude comprar" sheet, and the shared empty, loading, and error states from T-05, so none of T-24, T-26, or T-33 clearly covers them.
- **"I bought it" sheet and Undo confirmation** ([UX §2.4](../docs/02-UX-DESIGN.md#24-key-screens)): not built, and no Stitch folder. No design ticket names them, though T-26 designs the item page "for each status and role", which may include them.
- **Invitation, person page, and Mark as shipped routes:** the code has none and Architecture §2 names none. Mark as shipped is a sheet opened from My purchases and the item page.
- **Profile sections beyond FR-04:** the Stitch screen also shows groups, create a group, report a problem, and delete account. The code builds only contact, preferences, and sign out (milestone 1), and no ticket in the overview builds the rest.
- **App shell:** built in T-05 and restyled in T-20. It appears in every Stitch screen but is not a screen in UX §2.3, so it has no row.
- **Placeholder screen** (`src/app/(app)/placeholder-screen.tsx`): a temporary state from T-05 for the four tab routes above, replaced by the tickets that build those screens. It has no row.
- **Development sign-in form** on Welcome (`src/app/(public)/welcome-actions.tsx`): shown only when the development sign-in is on. It is not in UX §2.3 or Stitch, and has no row.
