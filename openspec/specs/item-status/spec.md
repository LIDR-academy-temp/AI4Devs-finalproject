# item-status Specification

## Purpose
Changing an item's status within the transitions of BR-22, so a buyer can reserve an item without anyone else buying it too, release it, and mark it as purchased with a note (US-15, US-16, FR-24, FR-25, FR-31), with every change recorded (BR-26).

## Requirements

### Requirement: Members and buyers reserve pending items, and the first one wins

`POST /items/{itemId}/reservation` SHALL reserve a pending item for the current user, a member or buyer of its group (BR-12, BR-22), only while it is pending, so of two simultaneous requests exactly one succeeds (BR-23). An item someone else reserved SHALL get `ALREADY_RESERVED`; one no longer pending for any other reason, including the user's own reservation, SHALL get `ITEM_CHANGED` (docs/05-API.md §1).

#### Scenario: AC-59 two buyers reserve at the same time

- **GIVEN** a pending item and two buyers of its group (docs/01-PRD.md §17.5, AC-59)
- **WHEN** both reserve it at the same time, on two connections
- **THEN** exactly one request succeeds; the other gets the reservation conflict; the item has one buyer, the one whose request succeeded, and one reservation is recorded
- Verified by an integration test, as docs/07-SECURITY-AND-TESTING.md §2.6 names it.

#### Scenario: FR-24 a member reserves a pending item

- **GIVEN** a member of a group and a pending item in it
- **WHEN** they reserve it
- **THEN** the answer is the item, reserved, with them as its buyer and a higher version
- Verified by an integration test.

#### Scenario: BR-22 an item that isn't pending can't be reserved

- **GIVEN** an item reserved by another buyer, an item the user reserved, and a purchased item
- **WHEN** the user reserves each one
- **THEN** the first gets the reservation conflict, the other two get the changed-item answer, and no item changes
- Verified by an integration test.

#### Scenario: BR-13 an item the user can't see can't be reserved

- **WHEN** a user reserves a deleted item, an item in an archived list, an item of a group they don't belong to, or an item of a group they have left
- **THEN** each request gets "not available"
- Verified by an integration test.

### Requirement: The item's buyer releases a reservation

`DELETE /items/{itemId}/reservation` SHALL return the item's buyer's reserved item to pending with no buyer and no buyer note, so anyone can reserve it again (FR-24, BR-22). Any other user SHALL get `FORBIDDEN`, including members (BR-12, BR-14). A request for an item that is no longer reserved SHALL get `ITEM_CHANGED`.

#### Scenario: AC-60 Juan releases his reservation

- **GIVEN** an item reserved by Juan (docs/01-PRD.md §17.5, AC-60)
- **WHEN** Juan releases it
- **THEN** it is pending with no buyer, and another buyer can then reserve it
- Verified by an integration test.

#### Scenario: BR-12 only the item's buyer releases it

- **GIVEN** an item reserved by Juan, and a pending item
- **WHEN** a member and another buyer release the first, and Juan releases the second
- **THEN** the first two get `FORBIDDEN` and the item stays reserved by Juan; the last gets the changed-item answer
- Verified by an integration test.

### Requirement: The item's buyer marks it as purchased, with an optional note

`POST /items/{itemId}/purchase` SHALL mark the item's buyer's reserved item as purchased (BR-22). The body MAY include a buyer note within BR-32's note limit (BR-25); a note that is empty after trimming SHALL be stored as no note, a note SHALL replace the item's buyer note, and a request without one SHALL keep it. Any other user SHALL get `FORBIDDEN` (BR-12); a request for an item that isn't reserved SHALL get `ITEM_CHANGED`.

#### Scenario: AC-61 another buyer can't mark Juan's item as purchased

- **GIVEN** an item reserved by Juan (docs/01-PRD.md §17.5, AC-61)
- **WHEN** another buyer of the group sends a request to mark it as purchased
- **THEN** it is rejected with `FORBIDDEN`, and the item is still reserved by Juan
- Verified by an integration test.

#### Scenario: AC-62 the buyer marks the item as purchased with a note

- **GIVEN** an item reserved by a buyer (docs/01-PRD.md §17.5, AC-62)
- **WHEN** they mark it as purchased with the note "Bought the generic brand"
- **THEN** it is purchased, the change is recorded in its status history with them as the author, and a member reading the item sees the buyer note
- Verified by an integration test. Showing the note and the timeline on the item page is verified in T-14.

#### Scenario: BR-25 the buyer note is optional and limited

- **GIVEN** items reserved by a buyer
- **WHEN** they mark one as purchased with no body, one with a note of only spaces, and one with a note longer than BR-32 allows
- **THEN** the first two are purchased with no buyer note; the last is refused as a field error and stays reserved
- Verified by an integration test.

#### Scenario: BR-25 a purchase keeps, replaces, or clears an earlier buyer note

- **GIVEN** items reserved by a buyer that already have a buyer note
- **WHEN** they mark one as purchased with no note, one with a new note, and one with the note set to none
- **THEN** the first keeps its note, the second has the new note, and the third has no note
- Verified by an integration test.

#### Scenario: BR-22 an item that isn't reserved can't be marked as purchased

- **GIVEN** a pending item and an item the user already marked as purchased
- **WHEN** the user marks each one as purchased
- **THEN** both get the changed-item answer, and neither changes
- Verified by an integration test.

### Requirement: Every status change raises the version and is recorded

Reserving and releasing SHALL clear the item's "Updated" marker (BR-19), and releasing SHALL clear its buyer note; purchasing SHALL leave the marker. Reserving, releasing, and purchasing SHALL each raise the item's version, so a member's edit or delete based on the earlier version is refused (BR-20), and SHALL each record one status history entry with the previous and new status, the user, and the time (BR-26). A refused request SHALL change nothing and record nothing.

#### Scenario: BR-26 reserving, releasing, and purchasing are recorded

- **GIVEN** a pending item
- **WHEN** a buyer reserves it, releases it, reserves it again, and marks it as purchased
- **THEN** its status history has, after its creation, pending to reserved, reserved to pending, pending to reserved, and reserved to purchased, each with the buyer as author, and its version rose by four
- Verified by an integration test.

#### Scenario: BR-19 reserving and releasing clear the Updated marker

- **GIVEN** a pending item, and two items reserved by Juan, the first with a buyer note, all three marked as updated
- **WHEN** Luis reserves the pending item, and Juan releases the first of his items and marks the second as purchased
- **THEN** the item Luis reserved and the item Juan released are no longer marked as updated, the released item has no buyer note, and the purchased item is still marked
- Verified by an integration test.

#### Scenario: BR-20 a member's edit from before a reservation is refused

- **GIVEN** a member who loaded a pending item, which a buyer then reserves
- **WHEN** the member saves an edit with the version they loaded
- **THEN** the edit gets the changed-item answer
- Verified by an integration test.
