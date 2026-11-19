# Spec Delta

## Purpose

Gives developers and automated tests the same known data to start from, covering each item, membership, and invitation status and each kind of access, without any risk to real data.

## ADDED Requirements

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
- **THEN** the García Group has one pending invitation that hasn't expired, one pending invitation past its expiry, one accepted invitation with the person who accepted it, and one cancelled invitation (BR-08)

#### Scenario: Cross-group data exists

- **WHEN** the seed has been loaded
- **THEN** the Pérez Group has one item, and the only García person with access to it is its owner, Luis

### Requirement: Seed data is consistent

The seed SHALL follow the business rules that the database doesn't enforce, so tests and the app see data the services could have produced.

#### Scenario: Owners are active members

- **WHEN** the seed has been loaded
- **THEN** each group's owner has an active `member` membership in that group (BR-07)

#### Scenario: Timeline matches each item

- **WHEN** the seed has been loaded
- **THEN** each item has a creation row and a row for each status change, each following an allowed transition, and its latest row ends in the item's status (BR-22, BR-26)

#### Scenario: Shipment matches its items

- **WHEN** the seed has been loaded
- **THEN** the shipment's items are all shipped items of its buyer in its group, and the shipment holds a copy of its delivery address (BR-28)

#### Scenario: One default address

- **WHEN** the seed has been loaded
- **THEN** "Grandma's house" is the García Group's only default address (BR-27)

#### Scenario: Seed people are ready to use the app

- **WHEN** the seed has been loaded
- **THEN** each person has a language, a valid WhatsApp number, accepted terms, and a completed onboarding (BR-01, BR-04)

### Requirement: Seed is safe to load again

Loading the seed into a database that already has it SHALL add nothing and change nothing, and SHALL keep rows that developers added or edited.

#### Scenario: Seed loads twice

- **GIVEN** a database where the seed has been loaded
- **WHEN** the seed is loaded again
- **THEN** it finishes without errors, and every table has the same rows

#### Scenario: Development changes survive

- **GIVEN** a seeded database where a developer added a group and edited a seeded item
- **WHEN** the seed is loaded again
- **THEN** the added group and the edit are still there

#### Scenario: Conflict with other data stops the load

- **GIVEN** an empty database, apart from a developer's own user with the email of a seed person
- **WHEN** the seed is loaded
- **THEN** it stops with an error naming the conflict
- **AND** no seed row was added

### Requirement: Seed stays local

`npm run db:seed` SHALL refuse any database that isn't on the local machine, because Infrastructure §2 keeps seed data to the local environment.

#### Scenario: Remote database is refused

- **GIVEN** `DATABASE_URL` points to a host other than the local machine, in its host or through a connection parameter
- **WHEN** the developer runs `npm run db:seed`
- **THEN** the command stops with an error before connecting
