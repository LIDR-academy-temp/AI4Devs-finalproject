# Spec Delta

## Purpose

Gives every new user a group and a list to start with, and lets users see the groups they belong to and who is in them, without ever revealing groups or people outside their own groups.

## ADDED Requirements

### Requirement: A new user without an invitation starts with a group and a list

When getting started runs for a user with no membership, past or present, the system SHALL create a group the user owns with an active member membership, and a first list in it, as BR-06 describes. The group and list names SHALL come from the translation files in the user's language.

#### Scenario: AC-01 a new user without an invitation gets a group they own and a first list

- **GIVEN** a new user with no membership (docs/01-PRD.md §17.1, AC-01)
- **WHEN** getting started runs for them
- **THEN** a group named after their first name exists, they own it and are an active member, and it has one list with the first list's name
- Verified by an integration test of the service.

#### Scenario: BR-06 names follow the user's language

- **GIVEN** a new user whose language is Spanish, and another whose language is English
- **WHEN** getting started runs for each
- **THEN** each group and list is named with the translation-file text in that user's language

#### Scenario: BR-06 a user who already has a membership gets no group of their own

- **GIVEN** a user with an active or ended membership in a group
- **WHEN** getting started runs for them
- **THEN** no group, membership, or list is created

#### Scenario: BR-06 running getting started twice creates one group

- **GIVEN** a new user with no membership
- **WHEN** getting started runs for them twice, including at the same time on two connections
- **THEN** the user owns exactly one group, with one list

### Requirement: The group name fits the field limit

The starting group's name SHALL be between 1 and 100 characters (BR-32), using the first word of the user's name, or the part of their email before the `@` when the name is empty, shortened so the whole name fits.

#### Scenario: BR-32 a very long first name is shortened to fit

- **GIVEN** a new user whose first name is 100 characters long
- **WHEN** getting started runs for them
- **THEN** the group's name is at most 100 characters and starts with the beginning of their first name

#### Scenario: BR-06 a user with no name is named from their email

- **GIVEN** a new user with an empty name and the email `ana.garcia@example.com`
- **WHEN** getting started runs for them
- **THEN** the group's name uses `ana.garcia` as the first name

### Requirement: Users list only their own groups

`GET /groups` SHALL return the groups where the signed-in user has an active membership, each with its name, the user's role (member or buyer), and whether the user owns it (FR-08, FR-18). It SHALL NOT return any other group: there is no search or directory (FR-17).

#### Scenario: AC-26 a user in two groups lists only those two

- **GIVEN** the seed user who is a buyer in one seed group and owns the other, and a third group they don't belong to (docs/01-PRD.md §17.2, AC-26)
- **WHEN** they request `GET /groups`
- **THEN** the response lists exactly their two groups, each with their role in it, and not the third
- Verified by an integration test against the seed data.

#### Scenario: BR-11 a group whose membership ended isn't listed

- **GIVEN** the seed's former buyer, whose only membership has ended
- **WHEN** they request `GET /groups`
- **THEN** the response lists no groups

### Requirement: Members see who is in their group

`GET /groups/{groupId}` SHALL return the group's name, its members with the owner marked, and its buyers, counting only active memberships. Under BR-12 only members of the group can view them: a buyer of the group SHALL get `403 FORBIDDEN`, and anyone else the `404 NOT_AVAILABLE` of a missing group (BR-13).

#### Scenario: BR-12 a member sees the group's members and buyers

- **GIVEN** a seed member of a seed group
- **WHEN** they request that group
- **THEN** the response has the group's name, its active members with the owner marked, and its active buyers, and not the former buyer

#### Scenario: BR-12 a buyer can't view the group's people

- **GIVEN** a seed buyer of a group
- **WHEN** they request that group
- **THEN** the response is 403 `FORBIDDEN`

#### Scenario: AC-26 a request for a group the user doesn't belong to is rejected like a missing one

- **GIVEN** a user in two groups, and a third group they don't belong to (docs/01-PRD.md §17.2, AC-26)
- **WHEN** they request the third group's members, a group ID that doesn't exist, and an ID that isn't a UUID
- **THEN** all three responses are 404 `NOT_AVAILABLE` with identical bodies, so nothing reveals whether the group exists

#### Scenario: BR-13 a former buyer can't view the group

- **GIVEN** the seed's former buyer, whose membership has ended
- **WHEN** they request that group
- **THEN** the response is 404 `NOT_AVAILABLE`

### Requirement: Deleted accounts are shown as "Former user"

Wherever these endpoints name a person whose account was deleted, the name SHALL be the translation-file text for "Former user" in the requesting user's language (BR-05). Whether an account was deleted SHALL be decided by its deletion date, not by a missing name; a live user without a name SHALL be named by the part of their email before the `@`.

#### Scenario: BR-05 only a deleted account is named "Former user"

- **GIVEN** a group with a deleted account whose name is still stored, and a live account with no name
- **WHEN** a member of the group requests it
- **THEN** the deleted account is named "Former user", and the live one by the part of their email before the `@`

#### Scenario: BR-05 a deleted user in a group is named "Former user"

- **GIVEN** a group with an active membership whose user has no name because their account was deleted
- **WHEN** a member of the group requests it
- **THEN** that person's name is the "Former user" text in the member's language

### Requirement: Every permission case is tested across groups

The group endpoints SHALL answer each seed user, for each seed group, a third group, a missing group, and a malformed ID, as BR-12 and BR-13 require, verified by one integration test per case using the seed data.

#### Scenario: T-07 permission tests across two groups using the seed data

- **GIVEN** the seed users: members, buyers, a user who is a buyer in one group and owns the other, and the former buyer
- **WHEN** each requests `GET /groups/{groupId}` for both seed groups, a third group, a missing group, and a malformed ID
- **THEN** each response is 200 for a member, 403 for a buyer, and the same 404 otherwise
- Verified by an integration test per case.
