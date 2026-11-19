# Spec Delta

## Purpose

Lets the people in a group see the group's lists, and members create new ones, so items can be organized in lists (FR-11, FR-12), without revealing another group's lists.

## ADDED Requirements

### Requirement: Members and buyers see the group's lists

`GET /groups/{groupId}/lists` SHALL return the group's lists that aren't archived, each with its ID and name, to members and buyers of the group (BR-12). Archived lists SHALL NOT be returned (BR-17).

#### Scenario: BR-12 a member and a buyer see the same lists

- **GIVEN** a seed member and a seed buyer of a group with two lists and one archived list
- **WHEN** each requests the group's lists
- **THEN** both get the two lists, and not the archived one
- Verified by an integration test against the seed data.

#### Scenario: AC-26 a request for another group's lists is rejected like a missing group

- **GIVEN** a user in two groups, and a third group they don't belong to (docs/01-PRD.md §17.2, AC-26)
- **WHEN** they request the third group's lists, and the lists of a group that doesn't exist
- **THEN** both responses are 404 `NOT_AVAILABLE` with identical bodies

### Requirement: Members create lists

`POST /groups/{groupId}/lists` SHALL create a list with the given name, validated against BR-32, for a member of the group, and answer 201 with the new list (FR-12). A buyer of the group SHALL get `403 FORBIDDEN` (BR-12), and anyone else `404 NOT_AVAILABLE` (BR-13).

#### Scenario: FR-12 a member creates a list

- **GIVEN** a seed member of a group
- **WHEN** they create a list named "Medicine"
- **THEN** the response is 201 with the new list, and it appears in the group's lists

#### Scenario: BR-12 a buyer can't create a list

- **GIVEN** a seed buyer of a group
- **WHEN** they create a list in it
- **THEN** the response is 403 `FORBIDDEN`, and no list is created

#### Scenario: BR-32 a list name outside the limit is refused

- **WHEN** a member creates a list with an empty name, or one longer than 100 characters
- **THEN** the response is 422 `VALIDATION_FAILED` with the name field indicated, and no list is created
