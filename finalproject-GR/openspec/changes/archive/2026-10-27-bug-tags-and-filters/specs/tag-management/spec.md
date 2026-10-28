# Spec Delta

## MODIFIED Requirements

### Requirement: Any project member can list the project's tags
The system SHALL allow a caller with at least `Viewer` access to list the project's tags, each with its name, colour, the number of non-deleted test cases carrying it, and the number of non-deleted bugs carrying it, ordered by name ignoring case.

#### Scenario: Listing tags with counts
- **WHEN** a Viewer lists the tags of a project where "smoke" is on two test cases and one bug, and "regression" on nothing
- **THEN** both tags are returned, "regression" first, with test case counts 0 and 2 and bug counts 0 and 1

#### Scenario: Tags are tenant-isolated
- **WHEN** a caller lists tags through their own project's route
- **THEN** no tag of another workspace's project is returned

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
