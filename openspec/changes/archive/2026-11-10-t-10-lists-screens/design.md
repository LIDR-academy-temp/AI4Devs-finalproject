# Design

## Context

- `src/app/(app)/lists/page.tsx` is the T-04 placeholder: it calls `requireTab("lists")` and `listLists` for the current group and shows the first list's name. `loadShell()` (T-05) gives each page the user (`getCurrentUser`: memberships with group and type, language), the tabs, the member groups, and the current group, once per request.
- T-09's services take `(db, userId, …)` and enforce BR-12, BR-13, BR-19, and BR-20: `listLists(db, userId, groupId)` (creation order), `loadList(db, listId)` (group of a list that isn't archived), `listItems(db, userId, listId, filters, language)` (creation order), and `getItem(db, userId, itemId, language)`. Both return `ItemView`, the API's `Item` schema, with recipient and buyer names. The browser's changes go through `POST /groups/{groupId}/lists`, `POST /lists/{listId}/items`, `PATCH /items/{itemId}` (with `version`), and `DELETE /items/{itemId}`.
- `POST /items/{itemId}/reservation` is defined in API §3 but not built; T-11 builds it.
- `src/shared/requests.ts` has the request schemas built from the BR-32 fields in `src/shared/fields.ts`, and `fieldErrors()` turns a Zod failure into the error format's `fields`. `src/components/api.ts` (`sendJson`) returns `{ ok, data }`, `{ ok: false, error }`, or `{ ok: false, offline }`.
- The shell renders pages inside a 640 px column; from 768 px the 272 px sidebar sits on the left. Refresh calls `router.refresh()`, which re-renders server components and keeps client component state. `TabNav` marks the tab whose address starts the current path.
- shadcn/ui has `button`, `checkbox`, `dropdown-menu`, `input`, `label`, `skeleton`, and `switch`. There is no dialog or textarea yet.
- Browser tests run a production build against the seeded test database; `tests/e2e/support.ts` signs up users, signs in as seed users (who must not be changed), runs axe, and can write to the test database (`addMemberGroup`).
- See proposal.md for why, and the specs for the required behavior.

## Goals / Non-Goals

**Goals:**

- Server-rendered screens that read through the existing services, with small client components for the quick field, filters, form, dialogs, and actions.
- Every decision about order, filter choices, and which actions a user has as pure functions in `src/shared/items.ts`, unit-tested, so pages and components only render.
- One way to handle API refusals on these screens, which T-12 reuses for the buyer's actions.

**Non-Goals:**

- No new endpoint, service, table, or column. No change to the `ItemView` shape.
- No component tests (Security and testing §2.2): screens are verified by browser tests.
- No client-side data cache or optimistic updates: after a change the screen re-renders from the server.

## Decisions

### 1. Addresses

| Screen | Address | Reads |
| --- | --- | --- |
| Lists | `/lists?list={listId}` | `listLists` for the current group; `listItems` for the chosen list, or the first one when `list` is missing or not in the group |
| Item page | `/items/{itemId}` | `getItem`; `loadList` for the item's group; on wide screens, `listItems` of the item's list (decision 6) |
| Add item | `/items/new?list={listId}` | `listLists` for the current group; the list preselected, or the first one |
| Edit item | `/items/{itemId}/edit` | `getItem`, `loadList`, `listLists` for the item's group |

The list is a query parameter, not a path segment, because the list belongs to the current group: when the group selector changes the group, `/lists?list=…` simply falls back to the new group's first list instead of showing a list from the group the user just left. Items keep one address for everyone, `/items/{itemId}`, so the buyer screens (T-12) and the WhatsApp links (milestone 2) link to the same page. The list switcher navigates with `router.push`, so Back returns to the previous list; Refresh keeps the address.

The item pages and the add form are members' screens through `loadShell()`, not tab screens: the item page opens for anyone `getItem` allows (members and buyers, BR-12), and shows member actions only when the user's membership in the item's group is `member`. The add and edit forms call `notFound()` for a user who isn't a member of the group. `getItem` throwing `NotAvailableError` becomes `notFound()`, which renders the shell's "not available" state (BR-13). The edit page renders the item page instead of the form when BR-19 no longer allows editing, so a stale link or a refresh after a conflict never shows a form that can't be saved.

*Alternatives:* `/lists/{listId}` and `/lists/{listId}/items/{itemId}`. Rejected: a list from another group in the path would need its own rule, and buyers (T-12) would open items under Lists, a tab they don't have.

### 2. Pure rules in `src/shared/items.ts`

- `arrangeItems(items)` returns `{ open, shipped }`: `open` has unavailable items first, then pending, reserved, and purchased items newest first (by `createdAt`, then `id` for a stable order); `shipped` has shipped items newest first. Tie-breaks are deterministic so tests don't flake.
- `filterChoices(items)` returns the person choices (people with items in the list, sorted by name with `localeCompare` in the page's language, and `none` when an item has no recipient) and the status choices (statuses present, in BR-22 order, with counts).
- `applyFilters(items, { person, status })` keeps the items matching both.
- `itemActions(item, viewer)` returns `{ main, menu, secondary }` from UX §2.5 within BR-19, where `viewer` is `{ userId, isMember }`: `reserve` on pending items for everyone; for members, `edit` while pending, reserved, or unavailable, and `delete` while pending or unavailable; Edit is the main action on unavailable items. Reserved-by-me and purchased-by-me get no actions here; T-12 adds "I bought it", Release, and "I shipped it" to this function.

The status labels, icons, and colors live in one `StatusChip` component keyed by status (DESIGN.md, Status Color Pairing Rules), with lucide icons matching DESIGN.md's symbols: `Circle` for pending, `Contrast` (a half-filled circle) for reserved, `Circle` filled with the text color for purchased, `Truck` for shipped, and `TriangleAlert` for unavailable. The text is always present, so color and icon are never the only cue.

*Alternatives:* ordering in SQL. Rejected: the service's order is part of T-09's tested API, and the screen's grouping is presentation.

### 3. Filters are client state over the loaded list

Lists loads all items of the list once (the PRD's performance target is 200 items in under 2 seconds) and filters in the browser. The filter state lives in the list view's client component and resets when the list changes (the component is keyed by list ID). Filter chips are toggle buttons with `aria-pressed`, at least 48 px tall, in two horizontally scrolling rows (person, status), each in a labeled group; the rows scroll inside themselves so the page never scrolls sideways at 360 px. When the status filter is Shipped, the shipped section is shown open.

*Alternatives:* filters in the address, sent to `GET /lists/{listId}/items` (FR-11). Rejected for the screen: each tap would be a server round trip, and the person choices would have to come from a second unfiltered read. The API filter stays for other clients.

### 4. Quick add and the floating + Add button

The quick field is a one-field form: an input whose visible label is "Type what you want…" (UX §2.4), with no placeholder, and a submit button reading "Add". Submitting posts `{ name }` to `POST /lists/{listId}/items`; on 201 it clears the field, keeps focus in it for the next item, and calls `router.refresh()`; a polite live region announces the added item. Validation uses `createItemRequestShape.name` before sending, so an empty name is indicated without a request.

The floating **+ Add** button is a link to `/items/new?list={listId}`, 56 px tall, fixed 16 px above the bottom bar on phones and at the bottom right of the list column on desktop, with page bottom padding so it never covers the last item. Its accessible name is "Add item" ("Agregar artículo"), which contains its visible text "Add", so the quick field's "Add" button and it are distinguishable for screen readers (WCAG 2.5.3, label in name).

### 5. One item form for adding and editing

`ItemForm` (client) takes the lists, the preselected list, and, when editing, the item. Fields, in UX §2.4 order: link (`type="url"`, `inputMode="url"`, optional), name (required), list (native `<select>`, which is the most usable picker on phones), quantity (`type="number"`, `inputMode="numeric"`, 1 to 99), and notes (textarea, help text). The recipient field is left for T-13; an edit never sends `recipientId`, so the item keeps its recipient.

Validation uses the shared Zod field schemas (`fields.name`, `fields.link`, `fields.quantity`, `fields.note`) and `fieldErrors()`, so the browser and server agree (FR-39):

- On save, every field is checked; failures are shown and the first failing field gets focus.
- A field is checked again on each change once it has been checked (left after typing, or saved), so messages appear as the user types without shouting at them on their first keystroke.
- A `422` from the server maps its `fields` onto the same messages.
- Text inputs set `maxLength` to the BR-32 limit, so typing stops there; a `CharacterCount` under the field appears from 80% of the limit and is announced politely when the limit is reached. Messages are tied to fields with `aria-describedby` and `aria-invalid`.

Add posts to `POST /lists/{listId}/items` with the chosen list and returns to `/lists?list={listId}`. Edit sends `PATCH /items/{itemId}` with only the changed fields plus `version`; changing the list sends `listId` (FR-16). On success it returns to `/items/{itemId}`; with nothing changed it returns without a request. Empty link and notes are sent as `null` to clear them.

**Changed item on save (BR-20).** On `409 ITEM_CHANGED`, the form shows the message, keeps its field state, and calls `router.refresh()`. The edit page re-renders with the latest item; the form takes the new `version` from its props (it is keyed by item ID, not version, so it isn't remounted). The form keeps in state only the fields the member edited; every other field shows the latest item, and only edited fields are sent, so saving again applies the member's changes over the latest item without undoing another member's edit to the fields they didn't touch. If the item can no longer be edited, the refreshed edit page shows the item page (decision 1); on `404` the form shows the "not available" state's message and the refresh shows the state.

*Alternatives:* a separate quick-edit sheet. Rejected: UX §2.4 has one form, and one form means one set of tests.

### 6. Side by side from 1024 px

The shell's content column keeps its 640 px maximum, except when the page contains an element marked `data-layout="wide"`: the column then widens to 1120 px using Tailwind's `has-[[data-layout=wide]]` variant on the column. No other screen changes, and the shell needs no new prop or context.

- **Lists** wraps its content in `data-layout="wide"`. From `lg` (1024 px) it is a grid: the list column (400 px) and the item side, which shows an empty state with "Choose an item to see it here." Below 1024 px only the list column renders, centered at the usual width.
- **Item page** for a member: from 1024 px the same grid, with the item's list in the left column and the item on the right, the open item highlighted with the 2 px primary border and `aria-current="page"`. Below 1024 px the list column is not rendered (`hidden lg:block`), and the page shows the item with a Back link to its list. The list column's quick field and + Add work there too.
- The list column is one server component, `ListColumn`, used by both pages, so the list looks and behaves the same in both places.

Tapping an item on desktop navigates to `/items/{itemId}`; since both pages render the same list column, the list doesn't visibly change. `TabNav` doesn't mark Lists on item pages; changing that would also mark it for buyers in T-12, so it waits for that ticket.

*Alternatives:* Next.js parallel and intercepting routes for a persistent list pane. Rejected: more routing machinery than one shared component, and the item address would behave differently on phones and desktop. Side by side from 768 px. Rejected: with the sidebar, the item side would be under 100 px wide (proposal).

### 7. Item page actions and refusals

The item page body is a server component; the actions are a client component, `ItemActions`, given the item's ID, version, name, list, and the result of `itemActions`. The header has a Back link, the item's name as the page's heading, and the **⋯** menu (shadcn `DropdownMenu`, not modal, labeled "More actions") holding Edit and Delete when allowed. Notes render as text in a `<p>` with `whitespace-pre-wrap`; React escapes it, and nothing in the app uses `dangerouslySetInnerHTML` (AC-95). **Open in store** is an `<a target="_blank" rel="noopener noreferrer">` styled as a secondary button, with an external-link icon and a screen-reader hint that it opens a new tab.

Delete opens a confirmation dialog (shadcn `Dialog`) with "Delete "{name}"?", Delete (destructive), and Cancel; focus returns to the menu button when cancelled. Confirming sends `DELETE /items/{itemId}` and, on 204, navigates to `/lists?list={listId}`.

I'll buy it sends `POST /items/{itemId}/reservation` with no body and refreshes on success. Refusals go through one helper, `handleItemRefusal(result)` in `src/components/lists/item-refusals.ts`, that maps `ITEM_CHANGED` and `NOT_AVAILABLE` to "This item changed. Showing the latest." and `ALREADY_RESERVED` to "Someone else already reserved it", shows it in a `FormAlert`, and calls `router.refresh()`; offline shows the couldn't-save message and changes nothing. A `NOT_AVAILABLE` refresh lands on the "not available" state. T-12 reuses the helper for the buyer's actions.

### 8. New list

**New list** is the last entry of the list menu (a shadcn `DropdownMenu` whose trigger shows "List" above the current list's name and a chevron, inside an `h2`; the screen's `h1`, "Lists", is for screen readers, and on the item page the `h1` is the item's name), after a separator; the lists are a radio group. It opens a `Dialog` with a name field (same validation and counter as decision 5) and Create. On 201 the dialog closes and the page navigates to `/lists?list={newId}`. The "No lists yet" empty state's action opens the same dialog.

### 9. Translations

New namespaces in `en.json` and `es.json`: `lists` (screen, switcher, New list, quick field, filters, shipped section, empty states, desktop hint), `itemForm` (titles, labels, help text), `fieldMessages` (the field messages per `FieldError` value and the character counter, shared by the item form, quick add, and New list), `item` (page labels, "For {name}", "Quantity: {count}", "Reserved by {name}", "Reserved by you", "Purchased by {name}", "Purchased by you", actions, delete confirmation), and `status` (the five labels from UX §2.5). The Lists placeholder's `comingSoon` is removed. Field messages are chosen by the `FieldError` value (`required`, `too_long`, `too_small`, `too_big`, `invalid`) per field, so the server's `fields` and the browser's checks show the same text. The existing translation key test keeps both files in step. Spanish strings are added to UX §2.10 in the same pull request.

### 10. Browser tests

- `tests/e2e/lists.spec.ts`, `tests/e2e/item-form.spec.ts`, and `tests/e2e/item-page.spec.ts`, one per capability, named with the scenario's ID (`AC-38 …`, `T-10 …`).
- Scenarios that change data sign up their own users; scenarios on the seed's statuses sign in as Ana and only look.
- `tests/e2e/support.ts` gains `createList(page, groupId, name)` and `createItem(page, listId, body)` through the API, `addMember(email, groupId)` and `setItemStatus(itemId, status, buyerEmail)` through the test database (no milestone 1 endpoint adds a member, and the reservation endpoint isn't built yet), and `deleteList(listId)` for the no-lists state.
- AC-95 creates the item as one new user and opens it as a second new user added to the group; it listens for page errors and dialogs, checks that the notes' text is visible as typed, that no `<script>` or `<b>` from the notes exists in the DOM, and that a global the script would set is undefined.
- Connection failures use `page.route` to abort the request.
- Desktop scenarios set a 1280 px viewport.

## Risks / Trade-offs

- [I'll buy it ships before its endpoint] → Until T-11 is merged, the tap gets a 404 and shows the item-changed message. T-10's tests check only that the button is shown (AC-23); T-12 verifies the tap. T-11 follows T-10, and both are merged before the D2 push, so the delivery has no gap.
- [The list column renders twice on wide screens' item pages] → One extra `listItems` read per item page for members; lists are capped by the performance target, and below 1024 px the column isn't rendered at all.
- [`has-[…]` widening depends on the browser supporting `:has()`] → All browsers Playwright tests and the PRD targets support it; without it the page keeps the 640 px column, which still works.
- [Seed-based scenarios depend on the seed's items] → They only read, and the seed is the documented fixture (Data model §3); a seed change that breaks them fails CI visibly.
- [Filtering in the browser] → Fine up to the 200-item target; larger lists would need the API filters.

## Migration Plan

No data migration. The Lists placeholder is replaced in place; rollback is reverting the pull request.
