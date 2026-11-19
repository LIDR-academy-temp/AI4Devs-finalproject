# Tasks

T-10's acceptance criteria are AC-23 (task 6.2), AC-38 (task 4.3), AC-40 (task 5.3), and AC-95 (task 6.3), plus AC-99 for each new screen (tasks 4.6, 5.6, and 6.6). The other scenarios are named after the rule they verify or after the ticket, as [Security and testing §2.6](../../../docs/07-SECURITY-AND-TESTING.md#26-coverage-targets) describes. Of the definition of done, the items in scope are lint and type checks (group 7; no endpoint changes, so `docs/openapi.yaml` stays as it is), interface text in Spanish and English (task 2.1), and the owning documents (group 1).

## 1. Documents first

- [x] 1.1 Update `docs/02-UX-DESIGN.md` §2.4, Lists: which list opens (the first by creation, or the one chosen, kept in the address); the order of the remaining items (newest first); the filter choices (people with items in the list and No person; statuses present, with counts); **New list** in the list menu, opening a dialog with the name; and the desktop hint when no item is selected. Item page: Delete asks for confirmation naming the item. Update the header. Verify that no PRD rule text is copied.
- [x] 1.2 Add to `docs/02-UX-DESIGN.md` §2.10 the English and Spanish for the new strings in design decision 9 that aren't there yet (for example New list, List name, Create, Type what you want…, Add item, Edit item, Name, Link, List, Quantity, All, Shipped, Reserved by you, More actions, Delete this item?, Cancel, Choose an item to see it here.).
- [x] 1.3 Update `DESIGN.md`, Responsive Layout Model: Lists shows the list and the item side by side from 1024 px; from 768 px to 1023 px it keeps the centered column. Update the header.
- [x] 1.4 Update `docs/08-WORK-TICKETS.md`, T-10: the item form has the FR-13 fields except the recipient, which T-13 adds; "I'll buy it" calls the reservation endpoint from T-11, and T-12 verifies the tap. Update the header.
- [x] 1.5 Run `npm run check:links`. Verify that it passes.

## 2. Translations, shared rules, and components

- [x] 2.1 Add the `lists`, `itemForm`, `item`, and `status` messages to `src/i18n/en.json` and `es.json` (design decision 9), using the UX §2.10 strings, and remove `lists.comingSoon`. Verify with the existing `tests/unit/translations.test.ts`.
- [x] 2.2 Add `src/shared/items.ts` with `arrangeItems`, `filterChoices`, `applyFilters`, and `itemActions` (design decision 2). Write `tests/unit/items.test.ts` with `T-10 the order of items`, `T-10 the filter choices come from the list`, and `BR-19 which actions each status allows` (member and buyer, each status, an item the user reserved). Verify that they pass.
- [x] 2.3 Add `src/components/ui/dialog.tsx` and `src/components/ui/textarea.tsx` with the shadcn command, styled to DESIGN.md (sheets and dialogs at level 3, 16 px radius, 48 px buttons, 50 px fields, focus ring). Verify with `npm run lint` and `npx tsc --noEmit`.
- [x] 2.4 Add to `src/components/lists/`: `status-chip.tsx` (icon, text, and colors per status), `character-count.tsx` (shown from 80% of the limit, announced politely at it), and `item-refusals.ts` with `handleItemRefusal` (design decision 7). Verify with `npm run lint` and `npx tsc --noEmit`.
- [x] 2.5 Let the shell's content column widen to 1120 px when the page has a `data-layout="wide"` element, in `src/components/app-shell/app-shell.tsx` (design decision 6). Verify that `tests/e2e/app-shell.spec.ts` still passes.

## 3. Browser test helpers

- [x] 3.1 Add to `tests/e2e/support.ts`: `createList` and `createItem` through the API; `addMember(email, groupId)`, `setItemStatus(itemId, status, buyerEmail)`, and `deleteList(listId)` through the test database (design decision 10). Verify with `npx tsc --noEmit`.

## 4. Lists screen

- [x] 4.1 Build `src/components/lists/list-column.tsx` (server): the list menu with the lists and New list, the quick field, the filters, the item cards (linking to `/items/{itemId}`, marking the open item), the collapsed shipped section, the + Add button, and the "No items yet" empty state; with client parts `list-menu.tsx`, `new-list-dialog.tsx`, `quick-add.tsx`, and `item-filters.tsx` (design decisions 3, 4, and 8). Verify with `npm run lint` and `npx tsc --noEmit`.
- [x] 4.2 Replace `src/app/(app)/lists/page.tsx` with the Lists screen: `requireTab("lists")`, the list from `?list=` or the current group's first list through `listLists` and `listItems`, the "No lists yet" state with New list, and the wide layout with the "Choose an item" side from 1024 px (design decisions 1 and 6). Add `src/app/(app)/lists/loading.tsx` with list-shaped skeletons. Verify by running `npm run dev` and opening Lists at 360 px and 1280 px.
- [x] 4.3 Write `tests/e2e/lists.spec.ts` with `AC-38 a member types only a name and saves`, `BR-32 quick add with an empty name`, and `T-10 quick add keeps the text when the save fails`. Verify that they pass.
- [x] 4.4 Add `T-10 a new member lands on their first list`, `T-10 a list from another group in the address shows the first list`, `T-10 a member switches to another list`, `FR-12 a member creates a list from the list menu`, `BR-32 an empty list name isn't created`, and `T-10 a group with no lists`. Verify that they pass.
- [x] 4.5 Add `T-10 the seed lists show every status in order`, `T-10 tapping an item opens its page`, `T-10 a member filters by person and by status`, `T-10 + Add opens the form for the current list`, `T-10 Refresh shows an item added elsewhere`, and `T-10 a member on desktop opens an item`. Verify that they pass.
- [x] 4.6 Add `AC-99 Lists in English` and `T-10 Lists has no accessibility violations`. Verify that they pass.
- [x] 4.7 Show "No items match these filters." when the filters hide every item (adversarial review), with UX §2.4 and §2.10 updated, and add `T-10 filters that match no item say so`. Verify that it passes.

## 5. Item form

- [x] 5.1 Build `src/components/lists/item-form.tsx` (client): link, name, list, quantity, and notes with help text; checks with the shared field schemas on save and on change once checked; server `fields` mapped to the same messages; counters and `maxLength`; couldn't-save handling; add and edit modes, with only changed fields and `version` on edit, and the changed-item handling (design decision 5). Verify with `npm run lint` and `npx tsc --noEmit`.
- [x] 5.2 Add `src/app/(app)/items/new/page.tsx` (members of the current group; the list from `?list=` or the first) and `src/app/(app)/items/[itemId]/edit/page.tsx` (`getItem`, `loadList`, and `listLists`; the item page when BR-19 no longer allows editing; "not available" for non-members and for items the user can't see) (design decision 1). Verify by running `npm run dev` and adding and editing an item.
- [x] 5.3 Write `tests/e2e/item-form.spec.ts` with `AC-40 a member saves with an empty name`, `T-10 a quantity of 0 and a link that isn't a web address are indicated`, and `BR-32 the name stops at its limit with a counter`. Verify that they pass.
- [x] 5.4 Add `T-10 a member adds an item with every field`, `BR-13 a buyer opens the add form`, `T-10 the form keeps the text when the connection fails`, `T-10 a member edits an item`, and `BR-19 the edit address of a purchased item shows its page`. Verify that they pass.
- [x] 5.5 Add `AC-39 a member moves an item to another list by editing it` and `BR-20 a member saves after someone else edited the item`. Verify that they pass.
- [x] 5.6 Add `AC-99 the item form in English` and `T-10 the item form has no accessibility violations`. Verify that they pass.

## 6. Item page

- [x] 6.1 Build `src/app/(app)/items/[itemId]/page.tsx` and its `loading.tsx`: `getItem` (`notFound()` when not available), the header with Back and the item's name, the status chip with the buyer's name or "you", For and Quantity, the notes as plain text, Open in store, and, for members from 1024 px, the item's list beside it; with `src/components/lists/item-actions.tsx` (client) for I'll buy it, the ⋯ menu, Edit as the main button on unavailable items, the delete confirmation, and refusals through `handleItemRefusal` (design decisions 6 and 7). Verify by running `npm run dev` and opening the seed's items as Ana.
- [x] 6.2 Write `tests/e2e/item-page.spec.ts` with `AC-23 a member opens a pending item` and `BR-19 actions on reserved, purchased, and unavailable items`. Verify that they pass.
- [x] 6.3 Add `AC-95 notes with HTML or script tags are shown as text` (design decision 10). Verify that it passes.
- [x] 6.4 Add `T-10 a reserved item names its buyer`, `T-10 Open in store opens the link in a new tab`, `T-10 a member deletes a pending item`, and `BR-20 a member deletes an item that was reserved meanwhile`. Verify that they pass.
- [x] 6.5 Add `AC-27 a member opens a deleted item` and `AC-25 a buyer opens another group's item`. Verify that they pass.
- [x] 6.6 Add `AC-99 the item page in English` and `T-10 the item page has no accessibility violations`. Verify that they pass.

## 7. Checks

- [x] 7.1 Run `npm run lint`, `npx tsc --noEmit`, and `npm test`. Verify that they pass, and that `npm run openapi:generate` leaves `docs/openapi.yaml` unchanged.
- [x] 7.2 Run `npm run test:e2e`. Verify that every browser test passes, including the existing `app-shell`, `onboarding`, `profile`, `welcome`, and `security-headers` specs.

## Workflow follow-up

- Commit the approved proposal, then run `/opsx:apply`.
- After the pull request is reviewed: `/opsx:archive`, record the session, and push (CLAUDE.md, Finishing a ticket).
