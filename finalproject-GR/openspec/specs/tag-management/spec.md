# tag-management Specification

## Purpose

Lets a project keep its own vocabulary of coloured, named tags (PRD §2.4, ADR 0016): created, listed with how widely they're used, renamed, recoloured, and deleted.

## Requirements

### Requirement: Any project member can list the project's tags
The system SHALL allow a caller with at least `Viewer` access to list the project's tags, each with its name, colour, the number of non-deleted test cases carrying it, and the number of non-deleted bugs carrying it, ordered by name ignoring case.

#### Scenario: Listing tags with counts
- **WHEN** a Viewer lists the tags of a project where "smoke" is on two test cases and one bug, and "regression" on nothing
- **THEN** both tags are returned, "regression" first, with test case counts 0 and 2 and bug counts 0 and 1

#### Scenario: Tags are tenant-isolated
- **WHEN** a caller lists tags through their own project's route
- **THEN** no tag of another workspace's project is returned

### Requirement: A Contributor or above can create a tag
The system SHALL allow a caller with at least `Contributor` access to create a tag with a name and an optional colour from the palette (gray, red, orange, amber, green, teal, blue, violet). The name SHALL be trimmed, non-empty, at most 50 characters, and unique within the project ignoring case. Without a colour, the tag SHALL get the palette colour after the most recently created tag's, starting from the first.

#### Scenario: Creating a tag
- **WHEN** a Contributor creates the tag "Smoke" with colour `green`
- **THEN** the tag is returned with that name and colour and appears in the project's tag list

#### Scenario: Default colours rotate
- **WHEN** a Contributor creates two tags without a colour in a project with no tags
- **THEN** they get `gray` and then `red`

#### Scenario: Duplicate names are refused
- **WHEN** a Contributor creates "smoke" in a project that has "Smoke"
- **THEN** the request is rejected with HTTP 409 and no tag is created

#### Scenario: Invalid input is refused
- **WHEN** a Contributor creates a tag with a blank name, a name over 50 characters, or a colour outside the palette
- **THEN** the request is rejected with HTTP 400

#### Scenario: A Viewer cannot create a tag
- **WHEN** a caller with only `Viewer` access creates a tag
- **THEN** the request is denied with HTTP 403

### Requirement: A Contributor or above can rename and recolour a tag
The system SHALL allow a caller with at least `Contributor` access to change a tag's name, colour, or both, with the same validation as creation.

#### Scenario: Renaming a tag
- **WHEN** a Contributor renames "Smoke" to "Smoke suite"
- **THEN** every test case carrying the tag shows "Smoke suite"

#### Scenario: Renaming to an existing name is refused
- **WHEN** a Contributor renames a tag to the name of another tag in the project, ignoring case
- **THEN** the request is rejected with HTTP 409 and the tag is unchanged

#### Scenario: A tag of another project is not found
- **WHEN** a Contributor updates a tag id that does not belong to the project in the route
- **THEN** the request returns HTTP 404

### Requirement: An Admin can delete a tag permanently
The system SHALL allow a caller with at least `Admin` access to delete a tag. Deletion SHALL be permanent and SHALL remove the tag from every test case and bug that carried it. A deleted tag does not go to the Trash.

#### Scenario: Deleting a tag in use
- **WHEN** an Admin deletes a tag carried by three test cases and one bug
- **THEN** the tag no longer appears in the tag list, and none of those test cases or the bug carries it

#### Scenario: A Contributor cannot delete a tag
- **WHEN** a caller with only `Contributor` access deletes a tag
- **THEN** the request is denied with HTTP 403 and the tag remains

### Requirement: Tag changes are recorded in the activity log
The system SHALL write an activity entry, in the same transaction, when a tag is created, renamed, recoloured, or deleted. A rename or recolour SHALL record the old and new values; a deletion SHALL record how many test cases and how many bugs carried the tag.

#### Scenario: Deleting is logged with its reach
- **WHEN** an Admin deletes a tag carried by three test cases and one bug
- **THEN** an activity entry names the tag, the acting user, a count of three test cases, and a count of one bug
