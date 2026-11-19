# items Specification

## Purpose
Lets members request items in seconds and keep them correct, by creating, editing, moving, and deleting them within the status rules, and lets everyone in the group read them, without revealing another group's items.

## Requirements

### Requirement: A name is enough to create an item

`POST /lists/{listId}/items` SHALL create an item for a member of the list's group from a name alone, or with the optional recipient, link, quantity, and notes (FR-13). The item SHALL start as pending, with a quantity of 1 by default and no buyer, and the response SHALL be 201 with the item.

#### Scenario: AC-38 a member types only a name and saves

- **GIVEN** a member inside a list (docs/01-PRD.md §17.4, AC-38)
- **WHEN** they create an item with only a name
- **THEN** the response is 201, and the item is `pending`, with a quantity of 1, no recipient, no link, and no buyer
- Verified by an integration test against the seed data.

#### Scenario: FR-13 a member creates an item with every field

- **GIVEN** a member inside a list, and a recipient of the same group
- **WHEN** they create an item with a name, the recipient, a link, a quantity, and notes
- **THEN** the item has each value, named recipient included

#### Scenario: FR-13 a recipient from another group is refused

- **WHEN** a member creates an item whose recipient belongs to another group, or doesn't exist
- **THEN** the response is 422 `VALIDATION_FAILED` with the recipient field indicated, and no item is created

### Requirement: Item fields are validated against BR-32

Creating and editing an item SHALL refuse a value outside its limit in BR-32 with `422 VALIDATION_FAILED`, indicating each failing field, and SHALL save nothing (FR-39).

#### Scenario: AC-40 a member saves with an empty name

- **WHEN** a member creates an item with an empty name, or one that is only spaces (docs/01-PRD.md §17.4, AC-40)
- **THEN** the response is 422 with the name field indicated as required, and no item is created

#### Scenario: AC-41 a name longer than 100 characters, or a quantity of 0 or 100, is refused

- **WHEN** a member creates an item with a 101-character name, with a quantity of 0, or with a quantity of 100 (docs/01-PRD.md §17.4, AC-41)
- **THEN** each response is 422 with that field indicated, and no item is created

#### Scenario: AC-45 a link that isn't an http or https URL is refused

- **WHEN** a member creates an item whose link isn't a valid http or https URL (docs/01-PRD.md §17.4, AC-45)
- **THEN** the response is 422 with the link field indicated, and no item is created

#### Scenario: BR-32 an edit outside the limits is refused

- **WHEN** a member edits an item with a name, quantity, link, or notes outside its limit
- **THEN** the response is 422 with that field indicated, and the item is unchanged

### Requirement: Creation and status changes are recorded

Creating an item, and each status change an edit causes, SHALL add a row to the item's status history with the author and time (BR-26).

#### Scenario: BR-26 creating an item records its creation

- **WHEN** a member creates an item
- **THEN** the item's status history has one row, from no status to `pending`, with the member as author and the time of creation

### Requirement: Everyone in the group reads lists' items

`GET /lists/{listId}/items` SHALL return the items in a list that isn't archived, and `GET /items/{itemId}` one item, to members and buyers of the list's group (BR-12). The items SHALL be filterable by recipient, including items with no recipient, and by status (FR-11).

#### Scenario: BR-12 a buyer reads a list's items and an item

- **GIVEN** a seed buyer of a group
- **WHEN** they request a list's items and one of those items
- **THEN** both responses are 200, and the item shows its status, recipient, and buyer

#### Scenario: FR-11 items are filtered by recipient and by status

- **GIVEN** a list with items for two recipients, one with no recipient, and items in different statuses
- **WHEN** a member filters by one recipient, by no recipient, and by one status
- **THEN** each response has only the matching items

### Requirement: Content outside the user's groups, deleted, or archived is not available

Requests for an item or list in a group the user has no active membership in, an item that doesn't exist or was deleted, and an item or list in an archived list SHALL get the same `404 NOT_AVAILABLE` (BR-13).

#### Scenario: AC-25 a buyer of one group opens an item from another group

- **GIVEN** a buyer of one seed group, and an item of the other seed group (docs/01-PRD.md §17.2, AC-25)
- **WHEN** they request that item
- **THEN** the response is 404 `NOT_AVAILABLE`, identical to the response for an item that doesn't exist

#### Scenario: AC-26 a request for another group's list items or items is rejected

- **GIVEN** a user in two groups, and a third group they don't belong to with a list and an item (docs/01-PRD.md §17.2, AC-26)
- **WHEN** they request that list's items and that item
- **THEN** both responses are 404 `NOT_AVAILABLE`, identical to the responses for a list and an item that don't exist

#### Scenario: AC-27 a deleted item isn't available

- **GIVEN** an item that a member of the group deleted (docs/01-PRD.md §17.2, AC-27)
- **WHEN** a member of the group requests it
- **THEN** the response is 404 `NOT_AVAILABLE`

#### Scenario: BR-13 an archived list and its items aren't available

- **GIVEN** the seed's archived list, with an item in it
- **WHEN** a member of the group requests the list's items, the item, or creates an item in the list
- **THEN** each response is 404 `NOT_AVAILABLE`

### Requirement: Only members change items

Creating, editing, and deleting items SHALL be refused for a buyer of the group with `403 FORBIDDEN` (BR-12), leaving the item unchanged.

#### Scenario: AC-51 a buyer's request to edit or delete an item is rejected

- **GIVEN** a seed buyer of a group, and an item in it (docs/01-PRD.md §17.4, AC-51)
- **WHEN** they send a request to edit the item, and one to delete it
- **THEN** both responses are 403 `FORBIDDEN`, and the item is unchanged

#### Scenario: BR-12 a buyer can't create an item

- **WHEN** a seed buyer creates an item in their group's list
- **THEN** the response is 403 `FORBIDDEN`, and no item is created

### Requirement: Edits are refused when the item changed

An edit SHALL include the item's version as the member last saw it, and SHALL be refused with `409 ITEM_CHANGED` when the item changed since, leaving it unchanged (BR-20). Every change SHALL increase the version.

#### Scenario: BR-20 an edit with a stale version is refused

- **GIVEN** an item a member loaded at one version, which has since been edited
- **WHEN** the member saves an edit with the version they loaded
- **THEN** the response is 409 `ITEM_CHANGED`, and the item keeps the other edit

#### Scenario: BR-20 two simultaneous edits from the same version

- **GIVEN** two members who loaded the same version of an item
- **WHEN** both save an edit at the same time
- **THEN** exactly one succeeds, the other gets 409 `ITEM_CHANGED`, and the version increased by one

### Requirement: Members edit items only in the statuses BR-19 allows

Members SHALL be able to edit an item while it is pending, reserved, or unavailable (BR-19). Editing a reserved item SHALL keep its reservation and mark it as updated for its buyer. Editing an unavailable item SHALL return it to pending and clear its buyer, recording the change. Editing a purchased or shipped item SHALL be refused with `409 ITEM_CHANGED`.

#### Scenario: AC-50 a member edits an unavailable item

- **GIVEN** the seed's unavailable item (docs/01-PRD.md §17.4, AC-50)
- **WHEN** a member edits it
- **THEN** it returns to `pending` with no buyer, and its status history records the change from `unavailable` to `pending` by that member

#### Scenario: BR-19 editing a reserved item keeps the reservation

- **GIVEN** the seed's item reserved by Juan
- **WHEN** a member edits its notes
- **THEN** it stays reserved by Juan and is marked as updated after the reservation

#### Scenario: BR-19 a purchased or shipped item can't be edited

- **WHEN** a member edits a purchased item, and a shipped item
- **THEN** both responses are 409 `ITEM_CHANGED`, and the items are unchanged

### Requirement: Items move to another list of the same group

An edit SHALL be able to move an item to another list of its group that isn't archived (FR-16). A list in another group, an archived list, or a list that doesn't exist SHALL be refused with `422 VALIDATION_FAILED`, indicating the list field.

#### Scenario: AC-39 a member creates a list and moves an item to it

- **GIVEN** a group with the list "Birthday" and an item in it (docs/01-PRD.md §17.4, AC-39)
- **WHEN** a member creates the list "Medicine" and moves the item to it by editing the item
- **THEN** the item appears in "Medicine" and no longer in "Birthday"

#### Scenario: FR-16 an item can't move to another group's or an archived list

- **WHEN** a member moves an item to a list of another group, to the archived list, or to a list that doesn't exist
- **THEN** each response is 422 with the list field indicated, and the item stays in its list

### Requirement: Members delete items only while pending or unavailable

`DELETE /items/{itemId}` SHALL delete a pending or unavailable item for a member, with its status history, and answer 204 (BR-19). Deleting an item in any other status SHALL be refused with `409 ITEM_CHANGED`, leaving it unchanged.

#### Scenario: BR-19 a member deletes a pending item and an unavailable item

- **WHEN** a member deletes a pending item and an unavailable item
- **THEN** both responses are 204, and neither item exists afterwards

#### Scenario: AC-47 a reserved item can't be deleted

- **GIVEN** a reserved item (docs/01-PRD.md §17.4, AC-47)
- **WHEN** a member tries to delete it
- **THEN** the response is 409 `ITEM_CHANGED`, and the item still exists, still reserved

#### Scenario: AC-48 a purchased item can't be deleted

- **GIVEN** a purchased item (docs/01-PRD.md §17.4, AC-48)
- **WHEN** a member tries to delete it
- **THEN** the response is 409 `ITEM_CHANGED`, and the item still exists, still purchased

### Requirement: A new link drops the old link's looked-up data

An edit that changes or clears an item's link SHALL clear the store name and thumbnail looked up for the old link and reset the lookup's progress, so they never describe a different link (BR-21).

#### Scenario: BR-21 changing the link drops what was looked up for the old one

- **GIVEN** an item with a link, a store name, a thumbnail, and a finished lookup
- **WHEN** a member edits it with a different link
- **THEN** the item has the new link, no store name or thumbnail, and no lookup

#### Scenario: BR-21 sending the same link again keeps what was looked up

- **GIVEN** an item with a link, a store name, a thumbnail, and a finished lookup
- **WHEN** a member edits its name and sends the same link again
- **THEN** the store name, thumbnail, and lookup are kept
