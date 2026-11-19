# T-09 Lists and items API

**Issue:** [#35](https://github.com/ojordan0/AI4Devs-finalproject/issues/35) · **Ticket:** [docs/08-WORK-TICKETS.md, T-09](../../../docs/08-WORK-TICKETS.md#t-09-lists-and-items-api) · **Branch:** `feat/t-09-lists-items-api`, based on `feat/t-07-groups-api`

**Covers:** Epic E-04. Stories: US-10 (main), US-07, US-11, US-12, US-13. Functional requirements: FR-11, FR-12 (creating lists), FR-13, FR-16, FR-39 (server side). Business rules: BR-12, BR-13, BR-19, BR-20, BR-26, BR-32. Acceptance criteria: AC-25, AC-27, AC-38, AC-39, AC-40, AC-41, AC-45, AC-47, AC-48, AC-50, AC-51.

## Why

Lists and items are the core of every request. The lists screen and item form (T-10) and the buying actions (T-11) both need an API that creates, reads, edits, and deletes them under the rules. D2 is due on November 19, 2026, and T-10 and T-11 depend on this ticket.

## What Changes

- **Lists:** `GET /groups/{groupId}/lists` lists a group's lists that aren't archived, for members and buyers. `POST /groups/{groupId}/lists` creates one, for members (BR-12).
- **Items in a list:** `GET /lists/{listId}/items`, for members and buyers, filtered by recipient (including items with no recipient) and by status (FR-11).
- **Create an item:** `POST /lists/{listId}/items`, for members. A name is enough (FR-13, quick add). Fields are validated against BR-32, and the item starts as pending with its creation recorded in the status history (BR-26). It counts against the item creation rate limit ([Security and testing §1](../../../docs/07-SECURITY-AND-TESTING.md#1-security)).
- **Read, edit, and delete an item:** `GET`, `PATCH`, and `DELETE /items/{itemId}`.
  - Edits carry the version the member last saw, and a stale version is refused (BR-20).
  - Members edit only while the item is pending, reserved, or unavailable, and delete only while it is pending or unavailable (BR-19). Editing a reserved item keeps the reservation and marks it updated for the buyer. Editing an unavailable item returns it to pending, which is recorded in the status history.
  - An edit can move the item to another list of the same group (FR-16).
- **Not available:** an item or list in another group, a deleted item, and an item or list in an archived list all answer the same `404 NOT_AVAILABLE` (BR-13). Buyers can view lists and items, but are refused changes with `403 FORBIDDEN` (BR-12).
- **Documents updated first**, because reviewing this ticket found gaps:
  - **Listing lists.** T-09's scope says "create lists", but the endpoint is `GET, POST`, and T-10's list switcher needs the list of lists. T-09 builds both, without the archived lists view, which comes with archiving in milestone 2 (FR-12). The ticket's scope says so.
  - **Where an item can be moved.** FR-16 doesn't say whether an item can move to another group's list. Recipients belong to a group, so an item moves only to another list of its own group. FR-16 says so.

## Capabilities

### New Capabilities

- `lists`: listing and creating a group's lists, within the user's role.
- `items`: creating, listing, reading, editing, moving, and deleting items within the status rules, with the version check and the status history.

### Modified Capabilities

None. The `group-access` check from T-03 and the `groups` endpoints from T-07 are used as specified.

## Non-goals

| Left out | Owner |
| --- | --- |
| Renaming, archiving, restoring, and deleting lists, and `?archived=true` | Milestone 2 (FR-12, increment 6) |
| Link lookup: title, image, and store name (`POST /link-previews`, `linkStatus` other than `none`) | Milestone 2 (FR-14) |
| The timeline, recipient details, shipment, and WhatsApp contacts in `GET /items/{itemId}` | T-14, T-13, T-16, and milestone 2 |
| `POST /items/{itemId}/seen`, which clears the "Updated" marker | Milestone 2 (AC-46) |
| Reserve, release, purchase, and couldn't buy it | T-11 and T-14 |
| Access for a user whose membership ended to items they purchased (BR-11) | Milestone 2 (FR-19) |
| Screens | T-10 |

## Impact

- **Endpoints (new):** `GET` and `POST /api/v1/groups/{groupId}/lists`, `GET` and `POST /api/v1/lists/{listId}/items`, and `GET`, `PATCH`, and `DELETE /api/v1/items/{itemId}`, in `src/app/api/v1/groups/[groupId]/lists/`, `src/app/api/v1/lists/[listId]/items/`, and `src/app/api/v1/items/[itemId]/`.
- **Services (new):** `src/server/services/lists.ts` and `src/server/services/items.ts`. Existing: `access.ts` (membership check) and `people.ts` (names of buyers).
- **Shared code (new):** the request schemas for lists and items in `src/shared/requests.ts`, built from the BR-32 fields in `src/shared/fields.ts` (existing).
- **Shared code (existing):** `src/server/http/schemas.ts` gets the list and item response schemas, including `Item`, `ItemStatus`, and `CreateItemRequest` from [API §3](../../../docs/05-API.md#3-openapi-definition-of-the-main-endpoints).
- **Tables (existing):** `lists` and `items` (read and written), `status_history` (written), `recipients` (read), and `users` (read, for buyer names). No schema change, so no migration.
- **Generated file (existing):** `docs/openapi.yaml` gets the seven operations.
- **Changed documents:** `docs/01-PRD.md` (FR-16) and `docs/08-WORK-TICKETS.md` (T-09 scope).
