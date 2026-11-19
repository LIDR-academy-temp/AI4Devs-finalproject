# Spec Delta

## Purpose

Defines the tables and the rules the database itself enforces, so invalid data can't be stored even if a service has a bug, and any empty database can be brought up to the current schema from migrations.

## ADDED Requirements

### Requirement: Schema built from migrations

Applying the migrations to an empty database SHALL create every table, enumeration, constraint, and index in Data model §2, including `job_runs` and `rate_limits`.

#### Scenario: Migrations build an empty database

- **GIVEN** an empty database
- **WHEN** the migrations are applied
- **THEN** every table and enumeration in Data model §2 exists, with the columns, indexes, and constraints it describes

#### Scenario: Migrations can run again

- **GIVEN** a database with every migration already applied
- **WHEN** the migrations are applied again
- **THEN** the command succeeds and changes nothing

### Requirement: Item buyer follows its status

An item SHALL have a buyer in every status except `pending`, and SHALL have no buyer while `pending` (BR-19, BR-22, BR-23).

#### Scenario: Pending item with a buyer is rejected

- **WHEN** an item with status `pending` and a buyer is stored
- **THEN** the database rejects it through the buyer check

#### Scenario: Item without a buyer outside pending is rejected

- **WHEN** an item with status `reserved`, `purchased`, `shipped`, or `unavailable` and no buyer is stored
- **THEN** the database rejects it through the buyer check

#### Scenario: Item with a buyer and a matching status is accepted

- **WHEN** an item with status `reserved` and a buyer is stored
- **THEN** the database accepts it

### Requirement: Item shipment follows its status

An item SHALL belong to a shipment only while its status is `shipped` (BR-24, BR-28).

#### Scenario: Shipment on an item that isn't shipped is rejected

- **WHEN** an item with status `purchased` and a shipment is stored
- **THEN** the database rejects it through the shipment check

#### Scenario: Shipped item with a shipment is accepted

- **WHEN** an item with status `shipped`, a buyer, and a shipment is stored
- **THEN** the database accepts it

### Requirement: Unavailable items keep their note

An item with status `unavailable` SHALL have a note saying why (BR-25).

#### Scenario: Unavailable item without a note is rejected

- **WHEN** an item with status `unavailable` and no note is stored
- **THEN** the database rejects it through the note check

### Requirement: Item quantity range

An item's quantity SHALL be within the range in BR-32, and SHALL default to 1.

#### Scenario: Quantity outside the range is rejected

- **WHEN** an item with a quantity of 0 or 100 is stored
- **THEN** the database rejects it through the quantity check

#### Scenario: Quantity limits are accepted

- **WHEN** an item with a quantity of 1 or 99 is stored
- **THEN** the database accepts it

### Requirement: Stored formats

Phone numbers SHALL have the E.164 format, links SHALL use http or https, and countries SHALL be two capital letters, wherever each is stored. Empty optional values SHALL stay allowed (BR-04, BR-27, BR-28, BR-32).

#### Scenario: Badly formatted phone number is rejected

- **WHEN** a value without the E.164 format is stored as a user's WhatsApp number, a delivery address's phone, or a shipment's address phone
- **THEN** the database rejects it through that column's format check

#### Scenario: Link with another scheme is rejected

- **WHEN** an item with a link starting with `ftp://` or `javascript:` is stored
- **THEN** the database rejects it through the link check

#### Scenario: Link scheme ignores capital letters

- **WHEN** an item with a link starting with `HTTPS://` is stored
- **THEN** the database accepts it

#### Scenario: Badly formatted country is rejected

- **WHEN** a value other than two capital letters is stored as a delivery address's country or a shipment's address country
- **THEN** the database rejects it through that column's format check

#### Scenario: Shipment without an address copy is accepted

- **WHEN** a shipment with no address copy is stored, because its group has no delivery address (BR-28)
- **THEN** the database accepts it

### Requirement: Unique values

The database SHALL reject a second row with a value Data model §2 marks as unique, including at most one default delivery address per group (BR-02, BR-27).

#### Scenario: Second identity for a provider's user ID is rejected

- **GIVEN** an identity for a provider and a provider user ID
- **WHEN** another identity with the same provider and provider user ID is stored
- **THEN** the database rejects it

#### Scenario: Second identity for a user and provider is rejected

- **GIVEN** a user with an identity for a provider
- **WHEN** another identity for the same user and provider is stored
- **THEN** the database rejects it

#### Scenario: Duplicate email is rejected

- **GIVEN** a user with an email
- **WHEN** another user with the same email is stored
- **THEN** the database rejects it

#### Scenario: Several deleted users have no email

- **GIVEN** a user whose email was erased (BR-05)
- **WHEN** another user with no email is stored
- **THEN** the database accepts it

#### Scenario: Other duplicates are rejected

- **WHEN** a session token, an invitation code, or a user's membership in a group is stored twice
- **THEN** the database rejects the second one

#### Scenario: Second default delivery address is rejected

- **GIVEN** a group with a default delivery address
- **WHEN** another default delivery address for the same group is stored
- **THEN** the database rejects it

#### Scenario: Default addresses in other groups and other addresses are accepted

- **GIVEN** a group with a default delivery address
- **WHEN** a non-default address for that group, or a default address for another group, is stored
- **THEN** the database accepts it

### Requirement: Required values, enumerations, and text limits

The database SHALL reject a missing required value, a value outside an enumeration, and text longer than the limit in Data model §2 (BR-32).

#### Scenario: Missing required value is rejected

- **WHEN** a row without a value in a column Data model §2 marks as not null is stored
- **THEN** the database rejects it

#### Scenario: Value outside an enumeration is rejected

- **WHEN** a value outside its enumeration is stored as a language, membership type or status, invitation status, item status, link status, or shipping service
- **THEN** the database rejects it

#### Scenario: Text over its limit is rejected

- **WHEN** text one character longer than its limit in Data model §2 is stored
- **THEN** the database rejects it

#### Scenario: Reference to a missing row is rejected

- **WHEN** a row referring to a group, list, or user that doesn't exist is stored
- **THEN** the database rejects it

### Requirement: Deleting a group

Deleting a group SHALL delete its memberships, invitations, recipients and their details, lists, items and their history, delivery addresses, and shipments, as Data model §2 describes (BR-07).

#### Scenario: Group with items in every status is deleted

- **GIVEN** a group with items in every status, including shipped items in a shipment with a delivery address
- **WHEN** the group is deleted
- **THEN** the deletion succeeds, and no row that belonged to the group remains
- **AND** the group's users and other groups are unchanged

### Requirement: Deleting a recipient, address, or shipment

Deleting a recipient, a delivery address, or a shipment SHALL keep the rows that refer to it, with the reference cleared (BR-15, BR-24, BR-28).

#### Scenario: Item outlives its recipient

- **GIVEN** a shipped item with a recipient and a copy of the recipient's name
- **WHEN** the recipient is deleted
- **THEN** the item remains, with no recipient and with the copied name

#### Scenario: Shipment outlives its delivery address

- **GIVEN** a shipment with a delivery address and a copy of it
- **WHEN** the address is deleted
- **THEN** the shipment remains, with no reference to the address and with the copy unchanged

#### Scenario: Item outlives its shipment

- **GIVEN** a shipment and a shipped item in it
- **WHEN** the shipment is deleted
- **THEN** the item remains, with no shipment

### Requirement: Users stay in the database

A user that other rows refer to as owner, member, inviter, buyer, author, or the person who added an item SHALL NOT be physically deleted, so history keeps working after account deletion. Their identities and sessions SHALL be deleted with them if they are deleted (BR-05).

#### Scenario: Deleting a user with history is rejected

- **GIVEN** a user who is the buyer of an item or the author of a status change
- **WHEN** the user is physically deleted
- **THEN** the database rejects the deletion

#### Scenario: Sign-in records don't block a deletion

- **GIVEN** a user with only an identity and a session
- **WHEN** the user is physically deleted
- **THEN** the user, identity, and session are all deleted
