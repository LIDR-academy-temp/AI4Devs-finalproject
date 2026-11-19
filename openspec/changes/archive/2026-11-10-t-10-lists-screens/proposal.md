# T-10 Lists screen, item form, and item page

**Issue:** [#36](https://github.com/ojordan0/AI4Devs-finalproject/issues/36) · **Ticket:** [docs/08-WORK-TICKETS.md, T-10](../../../docs/08-WORK-TICKETS.md#t-10-lists-screen-item-form-and-item-page) · **Branch:** `feat/t-10-lists-screens`

**Covers:** Epic E-04. Stories: US-10 (main), US-07. Functional requirements: FR-07, FR-08, FR-11, FR-12 (create only), FR-13, FR-16, FR-23, FR-39. Business rules: BR-12, BR-13, BR-19, BR-20, BR-22 (status labels), BR-32. Acceptance criteria: AC-23, AC-38 (interface), AC-40 (interface), AC-95.

## Why

A new user lands on a Lists placeholder that shows their first list's name and nothing else: they can't add, see, open, edit, or delete an item. T-09 built the lists and items API, and T-05 the shell around every screen. T-10 builds the screens on top of both, so a member requests an item in seconds and sees it in the list (flows A and B in UX §1), which is the first half of the core cycle that D2 (November 19, 2026) must show.

## What Changes

- **Lists screen (UX §2.4), replacing the T-04 placeholder:** the current group's list with a list switcher, a **New list** action (FR-12), quick add (FR-13), filters by person and by status, items with their status, `Unavailable` items first and `Shipped` items collapsed at the end, the floating **+ Add** button, and the empty states "No items yet…" and "No lists yet…" (UX §2.7).
- **Desktop layout (DESIGN.md, Responsive Layout Model):** on wide screens, Lists shows the list and the selected item page side by side.
- **Item form (UX §2.4), add and edit:** link, name, list, quantity, and notes, validated as the user types and on save against BR-32 (FR-39), with character counters near each limit. Editing sends the version the member loaded; a refused save shows "This item changed. Showing the latest." and keeps what they typed (BR-20). Moving an item to another list is editing its list (FR-16).
- **Item page (UX §2.4, §2.5) for members:** the status with its icon, text, and color; who it is for and the quantity; the item's notes as plain text (AC-95); **Open in store** in a new tab (FR-23); and the actions for each status: **I'll buy it** on pending items (AC-23), and **Edit** and **Delete** within BR-19, with Delete confirmed first.
- **Refresh and changed items:** the new screens load fresh data when opened and with Refresh (T-05). A save, delete, or reservation refused with `ITEM_CHANGED` or `NOT_AVAILABLE` shows "This item changed. Showing the latest." and refreshes the screen; `ALREADY_RESERVED` shows "Someone else already reserved it" and refreshes (UX §2.7). AC-67 and AC-68 are verified in T-12.
- **shadcn/ui components** the screens need: dialog (New list, Delete confirmation) and textarea.
- **Documents updated first**, because reviewing this ticket found gaps:
  - **Recipient field.** T-10 says "the fields in FR-13", but T-13 owns "recipient selection on the item form", and recipients can't be created before T-13. *Proposed:* T-10's form has every FR-13 field except the recipient; editing keeps the item's recipient; T-13 adds the selector (Work tickets, T-10).
  - **"I'll buy it" before T-11.** AC-23 needs the button on the member's item page, but the reservation endpoint is T-11's. *Proposed:* T-10 shows the button and calls `POST /items/{itemId}/reservation` as API §3 defines it, with the conflict handling above; T-12 verifies the tap (AC-67, AC-68) once T-11 is merged (Work tickets, T-10).
  - **Which list Lists opens, and order of items.** UX §2.4 puts `Unavailable` first and `Shipped` last but doesn't order the rest, or say which list opens. *Proposed:* the group's first list by creation, or the list chosen in the switcher, kept in the address; the remaining items newest first, so a quick-added item appears right under the field (UX §2.4).
  - **Filter choices.** *Proposed:* "All", then each person with items in the list, then "No person" when some item has none; "All", then each status present in the list, with its count (UX §2.4).
  - **Creating a list and confirming a delete.** UX §2.7 says "No lists yet. Create one." but no screen creates a list, and UX doesn't say whether deleting an item is confirmed. *Proposed:* **New list** in the list menu opens a dialog with the list's name; deleting an item asks for confirmation (UX §2.4).
  - **Where side by side starts.** DESIGN.md puts the list (380 to 420 px) and the item side by side from 768 px, but at 768 px the 272 px sidebar leaves under 500 px for both. *Proposed:* side by side from 1024 px; from 768 px to 1023 px, Lists keeps the single centered column (DESIGN.md, Responsive Layout Model).
  - **Desktop with no item selected.** *Proposed:* the item side shows "Choose an item to see it here." (UX §2.4).
  - **Spanish text.** UX §2.10 lacks most of the new screens' strings. *Proposed:* add them.

## Capabilities

### New Capabilities

- `lists-screen`: the Lists screen: current list, list switcher and New list, quick add, filters, item order and grouping, empty states, Refresh, and the desktop side-by-side layout.
- `item-form`: adding and editing an item: fields, validation as the user types, saving, moving to another list, and keeping typed text when the item changed.
- `item-page`: the item page for members: status, details, notes as plain text, Open in store, and the actions for each status, including deleting and I'll buy it, with the changed-item handling.

### Modified Capabilities

None. The `lists` and `items` specs (T-09) describe the API, which doesn't change. The `app-shell` placeholder requirement already excludes Lists.

## Non-goals

| Left out | Owner |
| --- | --- |
| Recipient selection on the item form, and the person's details on the item page | T-13 |
| Link lookup: "Looking up the product…", title, image, and store (FR-14, AC-42 to AC-44) | Milestone 2 (increment 6) |
| Rename, archive, and delete a list, and archived lists (FR-12, AC-52 to AC-55) | Milestone 2 (increment 6) |
| "Updated" marker and `POST /items/{itemId}/seen` (AC-46) | Milestone 2 (increment 6) |
| **Notify buyer**, **Message on WhatsApp** (FR-34, FR-35) | Milestone 2 (increment 8) |
| "Invite the person who will buy" when the group has no buyer | T-08, with invitations |
| The reservation endpoint, and "I bought it", Release, and the buyer's view of the item page | T-11, T-12 |
| "Couldn't buy it", its note, and the item timeline | T-14 |
| Shipping block on shipped items | T-16 |
| Buyer-only users opening items from To buy | T-12 |

## Impact

- **Pages (existing):** `src/app/(app)/lists/page.tsx` (the Lists screen replaces the placeholder).
- **Pages (new):** `src/app/(app)/lists/loading.tsx`; `src/app/(app)/items/[itemId]/page.tsx` (item page), `src/app/(app)/items/[itemId]/edit/page.tsx` (edit form), `src/app/(app)/items/new/page.tsx` (add form), and a `loading.tsx` for the item page; addresses under `items` as in Architecture §2.
- **Components (new):** in `src/components/lists/`: the list view (switcher, New list dialog, quick add, filters, item cards, shipped section, + Add button), the item form, the item page body and its actions, the status chip, and a text field with a character counter; `src/components/ui/dialog.tsx` and `src/components/ui/textarea.tsx` from shadcn/ui.
- **Shared code (new):** `src/shared/items.ts`: item order and grouping on Lists, filter choices, and which actions a user has on an item for its status (BR-19, UX §2.5), as pure functions.
- **Services (existing, unchanged):** pages read through `listLists` and `loadList` in `src/server/services/lists.ts`, `listItems` and `getItem` in `src/server/services/items.ts`, and `loadShell` (T-05). The browser changes data through the existing endpoints `POST /groups/{groupId}/lists`, `POST /lists/{listId}/items`, `PATCH /items/{itemId}`, and `DELETE /items/{itemId}`, and through `POST /items/{itemId}/reservation` once T-11 adds it.
- **Endpoints and tables:** none added or changed. No migration, and `docs/openapi.yaml` doesn't change.
- **Translations (existing):** `src/i18n/en.json` and `es.json` gain the Lists, item form, item page, and status strings; the Lists placeholder strings are removed.
- **Tests:** a new `tests/unit/items.test.ts`; new `tests/e2e/lists.spec.ts`, `tests/e2e/item-form.spec.ts`, and `tests/e2e/item-page.spec.ts`; `tests/e2e/support.ts` (existing) gains helpers to add a member to a group and to create lists and items through the API.
- **Shell (existing):** `src/components/app-shell/app-shell.tsx` lets Lists and the item page widen the content column for the side-by-side layout; other screens keep 640 px.
- **Changed documents:** `docs/02-UX-DESIGN.md` (§2.4, §2.10), `DESIGN.md` (Responsive Layout Model), and `docs/08-WORK-TICKETS.md` (T-10).
- **Dependencies:** none added; the shadcn/ui components use `radix-ui`, already installed (Architecture §1.6).
