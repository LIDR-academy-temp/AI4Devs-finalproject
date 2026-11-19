# Design

## Context

- T-09's `src/server/services/items.ts` has the private helpers this change needs: `loadItem` (status, version, and group of an item whose list isn't archived, or null), `selectItems` and `toView` (the API's `Item`, with recipient and buyer names), `readItem`, and `refusal` (`ITEM_CHANGED` when the item still exists, else `NOT_AVAILABLE`). Its edits are conditional updates on `version` and `status`, in a transaction with the status history row when the status changes.
- `src/server/services/access.ts` has `resolveGroupAccess` (an active membership of any type, else `NotAvailableError`) and `requireMemberAccess`. Memberships have `status` `active` or `ended`.
- `getCurrentUser` (T-07) computes `hasPurchases` as "the user is the buyer of a reserved or purchased item", with no membership condition, which gives the My purchases tab (FR-08, BR-11).
- Route handlers are declared with `routeDefinition` and built with `defineRoute`, which checks origin, session, onboarding, rate limits, path parameters (a bad ID answers 404), query and body (422 on failure), registers the OpenAPI path, and strips anything the response schema doesn't document. A request without a body reaches the body schema as `undefined`.
- The item page (T-10) already calls `POST /items/{itemId}/reservation` with no body and maps `ALREADY_RESERVED`, `ITEM_CHANGED`, and `NOT_AVAILABLE` to its messages.
- Integration tests build handlers with `createRouteHandler` and test dependencies, against a per-file copy of the seeded test database, with factories in `tests/support/factories.ts`.
- See proposal.md for why, and the specs for the required behavior.

## Goals / Non-Goals

**Goals:**

- Each status change is one conditional `UPDATE` plus its status history row in one transaction, so BR-23 holds without locks (Architecture §3, Data model: items).
- One place decides why a refused change was refused, so every status action answers the same way.
- To buy and My purchases read with one query each, using the same item view as the rest of the API.

**Non-Goals:**

- No new table, column, index, or migration: `(buyer_id, status)` and `(list_id, status)` already index these reads.
- No change to `Item`, `GET /items/{itemId}`, or the member edit and delete rules.
- No interface change: T-10's I'll buy it starts working as is, and T-12 builds the buyer screens.

## Decisions

### 1. A conditional update per transition

Each action runs in a transaction: `UPDATE items SET … , version = version + 1, updated_at = now WHERE id = :itemId AND <precondition> RETURNING id`, then, only when a row came back, an insert into `status_history` with `from_status`, `to_status`, `author_id`, and `created_at` from the injected clock.

| Action | Precondition | Sets |
| --- | --- | --- |
| Reserve | `status = 'pending'` | `status = 'reserved'`, `buyer_id = :userId`, `updated_after_reservation = false` |
| Release | `status = 'reserved' AND buyer_id = :userId` | `status = 'pending'`, `buyer_id = null`, `buyer_note = null`, `updated_after_reservation = false` |
| Purchase | `status = 'reserved' AND buyer_id = :userId` | `status = 'purchased'`, and `buyer_note` when the request includes one |

The membership check (`resolveGroupAccess` for the item's group, from `loadItem`) runs before the update, so a user outside the group, or whose membership ended, gets `NOT_AVAILABLE` (BR-13). Members and buyers pass alike: BR-12 lets both reserve, and release and purchase are limited by `buyer_id`, not by membership type. The version rises on every change, as the data model says it does, so a member's edit or delete based on an earlier version gets `ITEM_CHANGED` (BR-20).

Release clears the buyer note because the note belongs to the buyer who is letting the item go. Reserving clears the "Updated" marker because nothing has been edited since this reservation. Purchase leaves the marker for `POST /items/{itemId}/seen` (milestone 2).

*Alternatives:* `SELECT … FOR UPDATE` then update. Rejected: Architecture §3 chose conditional updates without locks, and one statement is simpler to reason about. Raising the version only on member edits. Rejected: the data model says it rises on every change, and a member's edit based on a pending item should not silently apply to a reserved one.

### 2. One refusal rule after a failed update

When the update returns no row, the item is loaded again and the answer is:

| Item now | Reserve | Release or purchase |
| --- | --- | --- |
| Missing, deleted, or in an archived list | `NOT_AVAILABLE` | `NOT_AVAILABLE` |
| Has a buyer who isn't the user | `ALREADY_RESERVED` when reserved, else `ITEM_CHANGED` | `FORBIDDEN` (BR-12, BR-14) |
| Anything else (the user's own reservation, pending, purchased, shipped, unavailable) | `ITEM_CHANGED` | `ITEM_CHANGED` |

Reserving one's own reserved item is `ITEM_CHANGED`, not a success: API §3 says the reservation succeeds only while the item is pending, and the interface refreshes and shows "Reserved by you". Release and purchase answer `FORBIDDEN` only when someone else is the buyer; a pending item has no buyer, so a stale screen gets `ITEM_CHANGED` and refreshes instead of an error the interface never expects (API §1: `FORBIDDEN` "only happens when it is bypassed").

The rule lives in `src/server/services/item-status.ts` as one function used by all three actions; `items.ts` exports `loadItem` and `readItem` for it.

### 3. The purchase body

`purchaseRequestShape = { buyerNote: optionalNote }` in `src/shared/requests.ts`, reusing the trimmed, nullable note from the item requests (BR-25, BR-32): omitted keeps the note, `null` or only spaces clears it, text replaces it. The route accepts a request with no body as an empty body, so the interface can send none. The handler passes `buyerNote` only when it is present.

*Alternatives:* a required body. Rejected: the note is optional, and the buyer screen (T-12) shouldn't have to send `{}`.

### 4. To buy and My purchases share a buyer item view

`src/server/services/buyer-items.ts` selects items joined with `lists` and `groups`, and returns `BuyerItemView = ItemView & { list: { id, name }, group: { id, name } }`, using the same view conversion as `items.ts` (recipient, buyer names, "Former user"). The HTTP schema is `buyerItemSchema = itemSchema.extend({ list, group })`, with `buyerItemCollectionSchema = { items: [...] }` (API §1, collections).

- **To buy:** `status = 'pending'`, list not archived, and an `active` membership of the user in the list's group, of any type (proposal, UX §2.2). Optional `groupId` and `listId` filters (`toBuyFiltersShape`, both `z.uuid().optional()`) add conditions; an ID the user can't see simply matches nothing.
- **My purchases:** `buyer_id = :userId`, list not archived, and either `status = 'purchased'` in any group or `status = 'reserved'` in a group with the user's active membership. A user who left a group keeps their purchased items until they ship them, but not their reservations, which leaving releases (BR-11, adversarial review finding 4). `hasPurchases` counts reservations in any group; the two agree once leaving releases reservations (milestone 2, increment 9).
- Both keep T-09's order, creation then ID. The screens arrange items themselves (T-12), as Lists does.

*Alternatives:* returning `Item` with a separate `lists` and `groups` lookup. Rejected: one more round trip and a join on the client for every screen. Restricting To buy to groups where the user is a buyer. Rejected for the proposal's reasons; it is one condition to change if the review decides otherwise.

### 5. Routes

| File | Definitions | Errors declared |
| --- | --- | --- |
| `src/app/api/v1/items/[itemId]/reservation/definitions.ts` and `route.ts` | `postReservation` (200, `itemSchema`), `deleteReservation` (200, `itemSchema`) | `ALREADY_RESERVED`, `ITEM_CHANGED`; `FORBIDDEN`, `ITEM_CHANGED` |
| `src/app/api/v1/items/[itemId]/purchase/definitions.ts` and `route.ts` | `postPurchase` (200, `itemSchema`) | `FORBIDDEN`, `ITEM_CHANGED` |
| `src/app/api/v1/me/to-buy/definitions.ts` and `route.ts` | `getToBuy` (`buyerItemCollectionSchema`, query `toBuyFiltersSchema`) | none beyond the defaults |
| `src/app/api/v1/me/purchases/definitions.ts` and `route.ts` | `getPurchases` (`buyerItemCollectionSchema`) | none beyond the defaults |

Release answers 200 with the item, as API §3 defines it, not 204. The new schemas are registered in `src/server/http/schemas.ts`, and `docs/openapi.yaml` is regenerated.

### 6. Tests

- `tests/integration/item-status-endpoints.test.ts`: the item-status scenarios. Items that change are made with the factories in a seed group, so the seed's own items stay as the other scenarios expect; AC-61 uses the seed's item reserved by Juan, which it doesn't change. AC-59 sends two reservations with `Promise.all` from two buyers; the pool gives each its own connection, so the database sees them at the same time.
- `tests/integration/buyer-items-endpoints.test.ts`: the buyer-items scenarios against the seed: Luis (buyer in García Group, member of Pérez Group), Juan, and Pedro (ended membership with a purchased item), plus an archived list made with the factories.
- Every response is checked against its schema with `expectMatchesSchema`.

## Risks / Trade-offs

- [The interface sends I'll buy it with no body, and some clients send `{}`] → No body schema on the reservation routes, so any body is ignored; the purchase route treats a missing body as empty (decision 3).
- [An optional body may not generate cleanly in the OpenAPI document] → Task 6.1 regenerates `docs/openapi.yaml` and the existing OpenAPI test checks it; if the generator rejects it, the purchase body becomes a required object with an optional note, and the reason is recorded here.
- [To buy includes the groups where the user is a member] → A member who also buys elsewhere sees their own group's pending items in To buy too. This follows UX §2.2 and is one condition to change (decision 4).
- [Seed-based tests depend on the seed's items] → They read only, or change factory-made items; the seed is the documented fixture (Data model §3).
- [Reserved items of a user who left a group would show in My purchases] → Can't happen until leaving exists; BR-11's automatic release comes with it (milestone 2).

## Migration Plan

No data migration. The new routes are additive; rollback is reverting the pull request.
