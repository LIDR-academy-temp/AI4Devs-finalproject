# Spec Delta

## Purpose

What a user can buy and what they bought, across all their groups: the pending items for To buy and the user's reserved and purchased items for My purchases (US-14, FR-21), each with the list and group it belongs to.

## ADDED Requirements

### Requirement: To buy lists the pending items of the user's groups

`GET /me/to-buy` SHALL return the pending items in every group where the user's membership is active, as a member or a buyer (FR-21, docs/02-UX-DESIGN.md §2.2), leaving out items in archived lists (BR-17) and in groups the user doesn't belong to or has left (BR-12, BR-13). Each item SHALL include its recipient, or none, so the interface can group items by person and set apart those with no one, and its list and group, each with ID and name.

#### Scenario: AC-58 To buy has the pending items with their person, list, and group

- **GIVEN** the seed user Luis, a buyer in García Group with pending items for Anthony and one with no recipient, and a member of Pérez Group with a pending item (docs/01-PRD.md §17.5, AC-58)
- **WHEN** he reads To buy
- **THEN** he gets exactly the pending items of both groups, each with its list and group; Anthony's item names him as its recipient, and the item with no recipient has none
- Verified by an integration test. Grouping by person and the filters on the screen are verified in T-12.

#### Scenario: FR-21 To buy leaves out other groups, other statuses, archived lists, and groups the user left

- **GIVEN** the seed buyer Juan, the seed user Pedro, whose membership in García Group ended, and a pending item in an archived list of García Group
- **WHEN** each reads To buy
- **THEN** Juan gets only García Group's pending items, without the archived list's item or any Pérez Group item, and Pedro gets none
- Verified by an integration test.

### Requirement: To buy filters by group and by list

`GET /me/to-buy` SHALL accept a group and a list to filter by, alone or together (FR-21). A filter naming a group or list the user can't see SHALL return no items, revealing nothing about it (BR-13). A filter that isn't an ID SHALL be refused as a field error (BR-32).

#### Scenario: AC-58 To buy filtered by group and by list

- **GIVEN** the seed user Luis (docs/01-PRD.md §17.5, AC-58)
- **WHEN** he reads To buy filtered by Pérez Group, then by García Group's "Medicine" list
- **THEN** he gets only Pérez Group's pending item, then only the Medicine list's pending item
- Verified by an integration test.

#### Scenario: BR-13 a filter for another group returns nothing

- **GIVEN** the seed buyer Juan, who isn't in Pérez Group
- **WHEN** he reads To buy filtered by Pérez Group, and filtered by a value that isn't an ID
- **THEN** the first returns no items, and the second is refused as a field error
- Verified by an integration test.

### Requirement: My purchases lists the user's reserved and purchased items

`GET /me/purchases` SHALL return every item the user reserved or purchased and hasn't shipped (FR-21), each with its list and group. Purchased items in a group the user has left SHALL be included, so they can still ship them; reserved items there SHALL NOT, since leaving releases them (BR-11). Other people's items, shipped items, and unavailable items SHALL NOT be included.

#### Scenario: FR-21 My purchases has the buyer's reserved and purchased items

- **GIVEN** the seed buyer Juan, who reserved one item, purchased another, and shipped two more
- **WHEN** he reads My purchases
- **THEN** he gets the reserved and the purchased item, each with its list and group, and not the shipped ones
- Verified by an integration test.

#### Scenario: BR-11 My purchases keeps purchased items after the user left the group

- **GIVEN** the seed user Pedro, whose membership in García Group ended, with an item he purchased there and an item still reserved in his name there
- **WHEN** he reads My purchases
- **THEN** he gets the purchased item, with its list and group, and not the reserved one
- Verified by an integration test.

#### Scenario: FR-21 a user with nothing reserved or purchased

- **GIVEN** a member who never reserved anything
- **WHEN** they read My purchases
- **THEN** they get no items
- Verified by an integration test.
