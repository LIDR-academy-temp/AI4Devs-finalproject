# group-access Specification

## Purpose
Decides on the server whether a user can reach a group's data, and in which role, so that every page and endpoint applies the same permissions and never reveals data from another group.

## Requirements

### Requirement: Access is decided from the user's membership

Before a domain service reads or changes a group's data, it SHALL resolve the user's active membership in that group and its type, member or buyer, as BR-12 requires. Pages and endpoints SHALL reach group data only through services that do this, as Architecture §1.1 describes.

#### Scenario: BR-12 a member's access resolves as member

- **GIVEN** a seed user with an active member membership in a seed group
- **WHEN** a service resolves their access to that group
- **THEN** it gets the type member
- Verified by an integration test against the seed data.

#### Scenario: BR-12 a buyer's access resolves as buyer

- **GIVEN** a seed user with an active buyer membership in a seed group
- **WHEN** a service resolves their access to that group
- **THEN** it gets the type buyer

#### Scenario: BR-12 an ended membership gives no access

- **GIVEN** the seed's former buyer, whose membership has ended
- **WHEN** a service resolves their access to that group
- **THEN** it is refused as not available

### Requirement: Missing and inaccessible data look the same

A request for a group the user has no active membership in, and a request for a group that doesn't exist, SHALL be refused with the same not-available error, which the API answers as `404 NOT_AVAILABLE` (BR-13). The two responses SHALL be identical in status, headers that depend on the data, and body.

#### Scenario: BR-13 another group's data gets the same 404 as missing data

- **GIVEN** a signed-in user who belongs to one seed group
- **WHEN** they request a second seed group they don't belong to, and a group ID that doesn't exist
- **THEN** both responses are 404 `NOT_AVAILABLE` with identical bodies
- Verified by an integration test through a test endpoint.

#### Scenario: BR-13 a malformed ID gets the same 404

- **WHEN** a signed-in user requests a group with an ID that isn't a UUID
- **THEN** the response is the same 404 `NOT_AVAILABLE`, not a validation error

### Requirement: Actions limited to members are refused for buyers

When an action is allowed only to members under BR-12, a service SHALL refuse a buyer of the same group with the forbidden error, which the API answers as `403 FORBIDDEN`, because the buyer can see the data but not take the action.

#### Scenario: BR-12 a buyer is refused a member-only action

- **GIVEN** a seed buyer of a group
- **WHEN** a service requires member access to that group for them
- **THEN** it is refused as forbidden, and the API answers 403 `FORBIDDEN`

#### Scenario: BR-12 a member passes a member-only check

- **GIVEN** a seed member of a group
- **WHEN** a service requires member access to that group for them
- **THEN** the check passes and returns the membership
