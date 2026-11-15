# Spec Delta

## MODIFIED Requirements

### Requirement: Seed contents

The seed SHALL load exactly the data in Data model §3 into an empty database.

#### Scenario: Seed loads into an empty database

- **GIVEN** a database with all migrations applied and no data
- **WHEN** the seed is loaded
- **THEN** it finishes without errors, and the groups, people, recipients and their details, lists, delivery addresses, and invitations in Data model §3 exist

#### Scenario: Items cover every status

- **WHEN** the seed has been loaded
- **THEN** the García Group has items in every item status, as Data model §3 lists them, with a buyer note on Juan's purchased item, a note on the unavailable item, one shipment holding two items, and one item with no recipient

#### Scenario: Former buyer keeps a purchased item

- **WHEN** the seed has been loaded
- **THEN** the former buyer's membership in the García Group has ended, and they are still the buyer of a purchased item in that group (BR-11)

#### Scenario: Invitations cover every state

- **WHEN** the seed has been loaded
- **THEN** the García Group has one pending buyer invitation for Carlos that hasn't expired, one pending invitation past its expiry, one accepted invitation with the person who accepted it, one cancelled invitation, and one declined invitation (BR-08), and only Carlos's has an invitee name

#### Scenario: Cross-group data exists

- **WHEN** the seed has been loaded
- **THEN** the Pérez Group has one item, and the only García person with access to it is its owner, Luis
