# Spec Delta

## MODIFIED Requirements

### Requirement: Members see who is in their group

`GET /groups/{groupId}` SHALL return the group's name, its members with the owner marked and each member's email, and its buyers with each buyer's WhatsApp number, counting only active memberships (FR-07, BR-04). Under BR-12 only members of the group can view them: a buyer of the group SHALL get `403 FORBIDDEN`, whose body contains no email and no WhatsApp number, and anyone else the `404 NOT_AVAILABLE` of a missing group (BR-13).

#### Scenario: BR-12 a member sees the group's members and buyers

- **GIVEN** a seed member of a seed group
- **WHEN** they request that group
- **THEN** the response has the group's name, its active members with the owner marked, and its active buyers, and not the former buyer

#### Scenario: FR-07 a member sees members' emails and buyers' WhatsApp numbers

- **GIVEN** the seed's owner of the García Group
- **WHEN** they request that group
- **THEN** each member in the response has their email, each buyer has their WhatsApp number in international format, and no member has a WhatsApp number and no buyer an email
- Verified by an integration test against the seed data.

#### Scenario: BR-12 a buyer can't view the group's people

- **GIVEN** a seed buyer of a group
- **WHEN** they request that group
- **THEN** the response is 403 `FORBIDDEN`

#### Scenario: AC-102 a buyer's request for the group has no contact details

- **GIVEN** a seed buyer of the García Group (docs/01-PRD.md §17.2, AC-102)
- **WHEN** they send a request for the group
- **THEN** the response is 403 `FORBIDDEN`, and its body contains none of the members' emails and none of the buyers' WhatsApp numbers
- Verified by an integration test against the seed data.

#### Scenario: AC-26 a request for a group the user doesn't belong to is rejected like a missing one

- **GIVEN** a user in two groups, and a third group they don't belong to (docs/01-PRD.md §17.2, AC-26)
- **WHEN** they request the third group's members, a group ID that doesn't exist, and an ID that isn't a UUID
- **THEN** all three responses are 404 `NOT_AVAILABLE` with identical bodies, so nothing reveals whether the group exists

#### Scenario: BR-13 a former buyer can't view the group

- **GIVEN** the seed's former buyer, whose membership has ended
- **WHEN** they request that group
- **THEN** the response is 404 `NOT_AVAILABLE`

### Requirement: Deleted accounts are shown as "Former user"

Wherever these endpoints name a person whose account was deleted, the name SHALL be the translation-file text for "Former user" in the requesting user's language (BR-05), and their email and WhatsApp number SHALL be empty. Whether an account was deleted SHALL be decided by its deletion date, not by a missing name; a live user without a name SHALL be named by the part of their email before the `@`.

#### Scenario: BR-05 only a deleted account is named "Former user"

- **GIVEN** a group with a deleted account whose name is still stored, and a live account with no name
- **WHEN** a member of the group requests it
- **THEN** the deleted account is named "Former user", and the live one by the part of their email before the `@`

#### Scenario: BR-05 a deleted user in a group is named "Former user"

- **GIVEN** a group with an active membership whose user has no name because their account was deleted
- **WHEN** a member of the group requests it
- **THEN** that person's name is the "Former user" text in the member's language

#### Scenario: BR-05 a deleted account shows no contact details

- **GIVEN** a group with a deleted member whose email is still stored, and a deleted buyer whose WhatsApp number is still stored
- **WHEN** a member of the group requests it
- **THEN** neither person has an email or a WhatsApp number in the response
