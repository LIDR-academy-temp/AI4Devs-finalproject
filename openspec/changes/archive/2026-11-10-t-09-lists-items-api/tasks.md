# Tasks

T-09's acceptance criteria each have a test task named with their ID: AC-25 (4.2), AC-27 (4.3), AC-38 (3.3), AC-39 (5.4), AC-40, AC-41, and AC-45 (3.4), AC-47 and AC-48 (6.3), AC-50 (5.3), and AC-51 (5.5). AC-26 gets tests for lists and items too (2.4 and 4.2). The other scenarios are named after the rule they verify, as [Security and testing §2.6](../../../docs/07-SECURITY-AND-TESTING.md#26-coverage-targets) describes. Of the definition of done, lint and type checks with an up-to-date OpenAPI document (group 7) and the owning documents (group 1) apply. No interface text is added: the errors use the messages from T-03.

## 1. Documents first

- [x] 1.1 Update FR-16 in `docs/01-PRD.md`: an item moves only to another list of its group. Update the header's version and date. Verify that no other rule says otherwise.
- [x] 1.2 Update T-09's scope in `docs/08-WORK-TICKETS.md`: list and create lists, without the archived lists view (milestone 2). Update the header. Verify with `npm run check:links`.

## 2. Lists

- [x] 2.1 Add the request schemas in `src/shared/requests.ts` (design decision 2), and the `List` and `ListCollection` response schemas in `src/server/http/schemas.ts` (design decision 6). Verify with `npx tsc --noEmit`.
- [x] 2.2 Add `loadList`, `listLists`, and `createList` in `src/server/services/lists.ts`, reading and writing `lists` (design decision 1). Add `GET` and `POST /groups/{groupId}/lists` in `src/app/api/v1/groups/[groupId]/lists/`. Verify with `npx tsc --noEmit`.
- [x] 2.3 Test the scenarios "BR-12 a member and a buyer see the same lists", "FR-12 a member creates a list", "BR-12 a buyer can't create a list", and "BR-32 a list name outside the limit is refused" in `tests/integration/lists-endpoints.test.ts`. Verify that they pass and every 200 and 201 response matches its schema.
- [x] 2.4 Test the scenario "AC-26 a request for another group's lists is rejected like a missing group", with Luis and a factory group. Verify that the two bodies are identical.

## 3. Creating items

- [x] 3.1 Add the `ItemStatus`, `Item`, `ItemCollection`, `CreateItemRequest`, and `UpdateItemRequest` schemas in `src/server/http/schemas.ts` (design decisions 2 and 6). Verify with `npx tsc --noEmit`.
- [x] 3.2 Add `loadItem`, `createItem`, and the item response mapping in `src/server/services/items.ts`, writing `items` and `status_history` and reading `recipients` and `users` (design decisions 1, 3, and 5). Add `POST /lists/{listId}/items` in `src/app/api/v1/lists/[listId]/items/`, with the item creation rate limit. Verify with `npx tsc --noEmit`.
- [x] 3.3 Write the test `AC-38 a member types only a name and saves` in `tests/integration/items-endpoints.test.ts`, and test the scenarios "FR-13 a member creates an item with every field", "FR-13 a recipient from another group is refused", and "BR-26 creating an item records its creation". Verify that they pass.
- [x] 3.4 Write the tests `AC-40 a member saves with an empty name`, `AC-41 a name longer than 100 characters, or a quantity of 0 or 100, is refused`, and `AC-45 a link that isn't an http or https URL is refused`. Verify that they pass and no item is created in each case.
- [x] 3.5 Test the scenario "BR-12 a buyer can't create an item". Verify that it passes.

## 4. Reading items

- [x] 4.1 Add `listItems`, with the recipient and status filters, and `getItem` in `src/server/services/items.ts`. Add `GET /lists/{listId}/items` and `GET /items/{itemId}` in `src/app/api/v1/items/[itemId]/`. Verify with `npx tsc --noEmit`.
- [x] 4.2 Write the tests `AC-25 a buyer of one group opens an item from another group` (Juan and the Pérez Group's item) and `AC-26 a request for another group's list items or items is rejected`. Verify that each 404 body is identical to the one for a missing resource.
- [x] 4.3 Write the test `AC-27 a deleted item isn't available`, deleting through `DELETE /items/{itemId}`. Verify that it passes.
- [x] 4.4 Test the scenarios "BR-12 a buyer reads a list's items and an item", "FR-11 items are filtered by recipient and by status", and "BR-13 an archived list and its items aren't available". Verify that they pass and every 200 response matches its schema.

## 5. Editing items

- [x] 5.1 Add `updateItem` in `src/server/services/items.ts`, with the conditional update and the status history row (design decision 4) and the target list check (design decision 3). Add `PATCH /items/{itemId}`. Verify with `npx tsc --noEmit`.
- [x] 5.2 Test the scenarios "BR-20 an edit with a stale version is refused" and "BR-20 two simultaneous edits from the same version". Verify that they pass, with the two edits sent at the same time.
- [x] 5.3 Write the test `AC-50 a member edits an unavailable item`, and test the scenarios "BR-19 editing a reserved item keeps the reservation" and "BR-19 a purchased or shipped item can't be edited". Verify that they pass and the history row has the member as author.
- [x] 5.4 Write the test `AC-39 a member creates a list and moves an item to it`, through `POST /groups/{groupId}/lists` and `PATCH /items/{itemId}`, and test the scenarios "FR-16 an item can't move to another group's or an archived list" and "BR-32 an edit outside the limits is refused". Verify that they pass.
- [x] 5.5 Write the test `AC-51 a buyer's request to edit or delete an item is rejected`. Verify that it passes and the item is unchanged.

## 6. Deleting items

- [x] 6.1 Add `deleteItem` in `src/server/services/items.ts`, with the conditional delete (design decision 4). Add `DELETE /items/{itemId}`. Verify with `npx tsc --noEmit`.
- [x] 6.2 Test the scenario "BR-19 a member deletes a pending item and an unavailable item". Verify that it passes and the items' status history is gone.
- [x] 6.3 Write the tests `AC-47 a reserved item can't be deleted` and `AC-48 a purchased item can't be deleted`. Verify that they pass and the items keep their status.

## 7. OpenAPI document and checks

- [x] 7.1 Regenerate `docs/openapi.yaml` with `npm run openapi:generate`. Verify that it has the seven operations with their named schemas and errors, that `Item` matches API §3, and that a second run changes nothing.
- [x] 7.2 Reset the link lookup fields when an edit changes `url`, and record the deleted recipient's name, the archiving race, and the "Updated" marker in design.md (adversarial review, findings 1 to 4). Test "BR-21 changing the link drops what was looked up for the old one". Verify that it passes.
- [x] 7.3 Reset the link lookup fields only when the link actually changes, and record in design.md that starting a lookup on edits belongs to the link lookup (adversarial re-review, findings 1 and 2). Test "BR-21 sending the same link again keeps what was looked up". Verify that it passes.
- [x] 7.4 Run `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run test:coverage`, `npm run check:links`, and `npm run build`. Verify that all pass and the domain services keep at least 80% line coverage.
