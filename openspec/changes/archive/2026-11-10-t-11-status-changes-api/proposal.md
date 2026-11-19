# T-11 Status changes: reserve, release, purchase

**Issue:** [#37](https://github.com/ojordan0/AI4Devs-finalproject/issues/37) · **Ticket:** [docs/08-WORK-TICKETS.md, T-11](../../../docs/08-WORK-TICKETS.md#t-11-status-changes-reserve-release-purchase) · **Branch:** `feat/t-11-status-changes-api`

**Covers:** Epic E-05. Stories: US-15 (main), US-14, US-16. Functional requirements: FR-21, FR-24, FR-25, FR-31 (reserve, release, purchase). Business rules: BR-11 (My purchases after access ends), BR-12, BR-13, BR-14, BR-22, BR-23, BR-25, BR-26, BR-32. Acceptance criteria: AC-58 (API), AC-59, AC-60, AC-61, AC-62 (API).

## Why

Members can request items (T-09, T-10), but nobody can buy them yet: "I'll buy it" on the item page calls an endpoint that doesn't exist. T-11 builds the buying half of the core cycle on the server, safe against two people buying the same thing, so T-12 can build the buyer screens and D2 (November 19, 2026) shows the whole cycle from request to purchase.

## What Changes

- **Reserve (FR-24, BR-23):** `POST /items/{itemId}/reservation` reserves a pending item for the current user, member or buyer of its group, as one conditional update, so the first of two simultaneous requests wins and the other gets `ALREADY_RESERVED`. An item that is no longer pending for another reason gets `ITEM_CHANGED`.
- **Release (FR-24):** `DELETE /items/{itemId}/reservation` returns the item to pending without a buyer. Only the item's buyer can release it (BR-12, BR-14).
- **Purchase (FR-25, BR-25):** `POST /items/{itemId}/purchase` marks the buyer's reserved item as purchased, with an optional buyer note within BR-32. Another user gets `FORBIDDEN` (AC-61).
- **Status history and version:** each of these changes is one of BR-22's transitions, raises the item's version (so stale member edits are refused under BR-20), and records a status history row with its author and time (BR-26).
- **To buy (FR-21):** `GET /me/to-buy` returns the pending items of every group the user belongs to, each with its recipient (none means "No person"), its list, and its group, filterable by group and list (AC-58, API part).
- **My purchases (FR-21):** `GET /me/purchases` returns the items the user reserved or purchased, the same set that gives them the My purchases tab, including purchased items in a group they have left (BR-11).
- **Documents updated first**, because reviewing this ticket found gaps:
  - **Whose groups To buy shows.** FR-21 says buyers see "the pending items of their groups", and UX §2.2 says To buy shows "all the user's groups". The API calls it "Pending items for the buyer". *Proposed:* every group where the user's membership is active, as a member or a buyer, so a member who also buys elsewhere sees everything they could buy in one place (API §2).
  - **What To buy and My purchases return.** The screens filter by group and list and group purchases by group, but `Item` has only the list's ID. *Proposed:* both return items with their list and group (ID and name) (API §2; the generated `docs/openapi.yaml` gets the schema).
  - **Where AC-58 and AC-62 are verified in the interface.** AC-58 is about the To buy screen and AC-62 says members see the buyer note, but no screen ticket lists them. *Proposed:* T-11 verifies the API part of both; T-12 lists AC-58 (interface), and T-14, which builds the timeline, lists AC-62 (interface) (Work tickets).

## Capabilities

### New Capabilities

- `item-status`: changing an item's status within BR-22: reserve, release, and purchase, with who may take each, the conflict and changed-item answers, the version, and the status history. Couldn't buy it, undo, and shipping add to it later.
- `buyer-items`: the cross-group views of what a user can buy and what they bought: To buy and My purchases.

### Modified Capabilities

None. The `items` spec already requires every status change to be recorded (BR-26) and refuses member edits to a stale version (BR-20); this change adds status changes that follow those rules without changing them.

## Non-goals

| Left out | Owner |
| --- | --- |
| To buy and My purchases screens, the buyer's item page, and the reserve, purchase, and release taps (AC-56, AC-57, AC-67, AC-68) | T-12 |
| Couldn't buy it, and the timeline on the item page (FR-26, FR-32, AC-63) | T-14 |
| Mark as shipped and shipments | T-16 |
| Undo (BR-24, AC-64) | Milestone 2 (increment 7) |
| Releasing reservations automatically when access ends (BR-11) or the account is deleted (BR-05), and opening a purchased item's page after leaving the group | Milestone 2 (increment 9, account lifecycle) |
| The "Updated" marker's `POST /items/{itemId}/seen` (BR-19) | Milestone 2 (increment 6) |

## Impact

- **Endpoints (new):** `POST /items/{itemId}/reservation`, `DELETE /items/{itemId}/reservation`, `POST /items/{itemId}/purchase`, `GET /me/to-buy`, `GET /me/purchases` (API §2), as route handlers under `src/app/api/v1/items/[itemId]/reservation/`, `src/app/api/v1/items/[itemId]/purchase/`, `src/app/api/v1/me/to-buy/`, and `src/app/api/v1/me/purchases/`.
- **Endpoints (existing, unchanged):** `GET /items/{itemId}` already returns the buyer and the buyer note; `PATCH` and `DELETE /items/{itemId}` already refuse a stale version or a status BR-19 doesn't allow.
- **Tables (existing, unchanged schema):** `items` (`status`, `buyer_id`, `buyer_note`, `version`, `updated_after_reservation`, `updated_at`), `status_history`, read with `lists`, `groups`, `memberships`, `recipients`, and `users`. No migration.
- **Services:** `src/server/services/item-status.ts` (new) for reserve, release, and purchase; `src/server/services/buyer-items.ts` (new) for To buy and My purchases; `src/server/services/items.ts` (existing) shares its item loading and view with them.
- **Shared code (existing):** `src/shared/requests.ts` gains the purchase body and the To buy filters, built from the BR-32 fields.
- **HTTP schemas (existing):** `src/server/http/schemas.ts` gains the purchase request, the To buy filters, and the item with its list and group.
- **Generated document (existing):** `docs/openapi.yaml`, regenerated with `npm run openapi:generate`.
- **Interface (existing, unchanged):** the item page's I'll buy it (T-10) starts working against the new endpoint; its tap is verified in T-12.
- **Tests (new):** `tests/integration/item-status-endpoints.test.ts` and `tests/integration/buyer-items-endpoints.test.ts`.
- **Changed documents:** `docs/05-API.md` (§2) and `docs/08-WORK-TICKETS.md` (T-11, T-12, T-14).
- **Dependencies:** none added.
