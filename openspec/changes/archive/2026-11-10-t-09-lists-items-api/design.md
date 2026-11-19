# Design

## Context

- T-07 (this branch's base) added route declarations in `definitions.ts` files next to each `route.ts`, built with `routeDefinition()`, so tests build the real endpoints with their own dependencies. It also added the named response schemas in `src/server/http/schemas.ts`, `personName` in `src/server/services/people.ts`, and the collection convention in [API §1](../../../docs/05-API.md#1-conventions).
- T-03's membership check (`resolveGroupAccess`, `requireMemberAccess`) takes a group ID. Lists and items reach their group through `lists.group_id`, so the services find the group in their own query first.
- The seed has items in every status in the García Group, one item in the Pérez Group, and an archived list with no items.
- See proposal.md for why, and the specs for the required behavior.

## Goals / Non-Goals

**Goals:**

- One way to load a list or an item together with its group and archived state, so every endpoint applies BR-12 and BR-13 the same way.
- Status and version checks that hold under concurrent requests, without locks (Architecture §3, Concurrency).

**Non-Goals:**

- No link lookup: `linkStatus` stays `none`, and `storeName` and `thumbnailUrl` stay null.
- No change to the response shape that later tickets need, beyond the `Item` schema in API §3.

## Decisions

### 1. Load the resource with its group, then check access

`src/server/services/lists.ts` has `loadList(db, listId)`, which returns the list's group ID and whether it is archived, or nothing. `src/server/services/items.ts` has `loadItem(db, itemId)`, which joins the item to its list for the same two facts. Each endpoint's service then:

1. Treats a malformed ID, a missing row, and a row in an archived list as not available (BR-13).
2. Calls `resolveGroupAccess` (reads) or `requireMemberAccess` (changes) with the group ID, so another group gives the same not-available error, and a buyer the forbidden one (BR-12).

Path IDs are declared as UUIDs, so the route wrapper answers a malformed one with the same 404 before any query (T-03).

### 2. Request schemas shared with the interface

`src/shared/requests.ts` builds the request bodies from the BR-32 fields in `src/shared/fields.ts`:

- `createListRequest`: `{ name }`.
- `createItemRequest`: `{ name, recipientId?, url?, quantity?, notes? }`, matching `CreateItemRequest` in API §3. Optional text that is empty after trimming is stored as null.
- `updateItemRequest`: `{ version, name?, recipientId?, url?, quantity?, notes?, listId? }`, with at least one field besides `version`. `null` clears an optional field; a missing property leaves it as it is.
- `itemFilters`: the query of `GET /lists/{listId}/items`: `recipientId` (a UUID, or `none` for items with no recipient) and `status`.

The interface (T-10) imports them for validation as the user types (FR-39). The server registers copies built from the same shapes in `src/server/http/schemas.ts`, because only schemas created after the Zod extension can be named in the OpenAPI document (T-03, design decision 9).

### 3. A recipient or target list must belong to the item's group

A `recipientId` or a target `listId` that doesn't belong to the item's group, doesn't exist, or (for a list) is archived is a field error, `422 VALIDATION_FAILED` with that field marked `invalid`. One answer covers all three cases, so a body can't be used to probe for another group's recipients or lists, and the form can point to the field.

*Alternative:* `404 NOT_AVAILABLE`. Rejected: the item itself is available; only one field of the request is wrong, and FR-39 indicates the field.

### 4. Status and version checks as conditional statements

- **Edit:** one `UPDATE … WHERE id = $id AND version = $version AND status IN ('pending', 'reserved', 'unavailable') RETURNING …`, inside a transaction with the status history insert. It sets the new values, `version = version + 1`, and `updated_at` from the clock. For a reserved item it also sets `updated_after_reservation = true`. For an unavailable item it sets `status = 'pending'`, `buyer_id`, `unavailable_note`, and `buyer_note` to null, and inserts the `unavailable` → `pending` history row with the member as author. The new status depends on the old one, so the statement updates only rows still in the status the service read; a row that changed in between doesn't match.
- **Link fields:** an edit that changes or clears `url` also resets `store_name`, `thumbnail_url`, and `link_status` to null, null, and `none`, so a later lookup (FR-14) never shows the old link's store or image (adversarial review, finding 2). Sending the same link again keeps them (adversarial re-review, finding 1). Starting a lookup for the new link, on edits as on creation, is part of the milestone 2 link lookup, which sets `link_status` to `pending` when it does (adversarial re-review, finding 2).
- **The "Updated" marker:** any saved edit of a reserved item sets it, even one whose values match the stored ones; comparing every field isn't worth a read for a case the form doesn't produce (adversarial review, finding 4).
- **Delete:** `DELETE … WHERE id = $id AND status IN ('pending', 'unavailable')`. The status history rows go with the item (cascade).
- **When nothing matches:** the service reads the item again. A missing item is not available. An item that still exists answers `409 ITEM_CHANGED`. That covers a stale version (BR-20) and a status that no longer allows the action ([API §1](../../../docs/05-API.md#1-conventions): "the action no longer applies to its status"). The interface never offers editing a purchased item or deleting a reserved one, so reaching this means the screen is out of date, and UX design §2.7 shows "This item changed" and refreshes.

*Alternatives:* `RULE_VIOLATION` with a reason for the status cases. Rejected: API §1 assigns "no longer applies to its status" to `ITEM_CHANGED`, and the interface handles both the same way. A `SELECT … FOR UPDATE` before each change. Rejected: Architecture §3 chooses versions and conditional updates over locks.

### 5. Creating an item

One transaction inserts the item with `added_by`, the clock's time, and `version = 1`, and the history row from null to `pending` (BR-26). The route declares the item creation rate limit from `src/shared/limits.ts`.

### 6. Response shapes

- `List`: `{ id, name }`. `ListCollection`: `{ lists: [...] }`, ordered by creation time, then ID.
- `Item`: exactly the schema in [API §3](../../../docs/05-API.md#3-openapi-definition-of-the-main-endpoints). `recipient` is `{ id, name }` from `recipients`, or null. `buyer` is a `PersonRef`, named with `personName` (Former user). `shipmentId` is returned as stored. `ItemCollection`: `{ items: [...] }`, ordered by creation time, then ID; the interface groups them by status (UX design §2.4).
- `ItemStatus` is registered by name, as in API §3.

A recipient deleted under BR-15 (milestone 2) leaves `recipient_id` null and `recipient_name` set. Until recipients can be deleted, no item is in that state, so `recipient` is built only from the joined recipient. Showing the saved name, which needs a recipient shape without an ID in API §3, and leaving those items out of the `none` filter, are part of deleting recipients (adversarial review, finding 1).

### 7. Tests

Integration tests per endpoint, building handlers from the declarations with `testDependencies({ db })`, in `tests/integration/lists-endpoints.test.ts` and `tests/integration/items-endpoints.test.ts`. They use the seed users and items, and factories for a third group with a list and an item, and for items in the archived list. Every 200 and 201 response is checked against its schema. The concurrency test sends two edits from the same version at once through the pool's separate connections.

## Open points in the documents

The documents left these points open. Each was settled in the document that owns it, in this pull request; this section records why.

- **Listing a group's lists.** [API §2](../../../../docs/05-API.md#2-endpoints) has `GET /groups/{groupId}/lists`, but the T-09 scope only named creating lists, and [T-10](../../../../docs/08-WORK-TICKETS.md#t-10-lists-screen-item-form-and-item-page) needs the list of lists to switch between them. *Chosen:* T-09 builds it, without `?archived=true`, which comes with archiving in milestone 2. *Changed:* the scope of [T-09](../../../../docs/08-WORK-TICKETS.md#t-09-lists-and-items-api).
- **Moving an item to another group.** FR-16 allowed moving an item to another list without saying whose. *Chosen:* only lists of the same group, because an item's recipient belongs to its group, so a move across groups would leave the item with a recipient the new group doesn't have (decision 3). *Changed:* FR-16 in [PRD §13.4](../../../../docs/01-PRD.md#134-lists-and-items).

The other choices this change made are technical and are recorded above: the field errors for a recipient or list from another group (decision 3), `409 ITEM_CHANGED` for a refused edit or delete, clearing the buyer of an unavailable item that is edited, and resetting the link fields only when the link changes (decision 4), and the `Item` response (decision 6). No package outside [Architecture §1.6](../../../../docs/03-ARCHITECTURE.md#16-dependencies) was needed.

## Risks / Trade-offs

- [The target list is checked before the `UPDATE`, so a list archived in between could receive the moved item.] → Archiving is milestone 2; that ticket guards the move in the statement itself (adversarial review, finding 3).
- [Re-reading the item after a refused change costs one more query.] → Only on the refusal path.
- [The full-schema `Item` response includes `updatedAfterReservation` for every user.] → It is the buyer's marker (BR-19); members see it too, which shows that the buyer has an update to read. No personal data.
- [Items in a list are returned all at once.] → Lists hold tens of items for a family; pagination can come with search ([PRD §18](../../../docs/01-PRD.md#18-future-features)).

## Migration Plan

No schema change and no migration. Rollback is reverting the pull request.
