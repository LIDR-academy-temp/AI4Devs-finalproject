# Spec Delta

## MODIFIED Requirements

### Requirement: Tags are managed in a Manage tags dialog
The Tags filter SHALL offer Manage tags, which lists every tag of the project with its colour and the number of test cases and bugs carrying it. Contributors and Admins SHALL be able to rename a tag and pick its colour from the palette there; Admins SHALL be able to delete a tag after confirming a message that states how many test cases and bugs carry it. Viewers SHALL see the list without edit controls.

#### Scenario: Recolouring a tag
- **WHEN** a Contributor opens Manage tags and picks blue for "smoke"
- **THEN** every "smoke" badge on the screen turns blue

#### Scenario: Deleting a tag after confirming
- **WHEN** an Admin deletes "legacy", which three test cases and one bug carry, and confirms the message stating three test cases and one bug
- **THEN** "legacy" disappears from the dialog, the filter, those test cases, and the bug

#### Scenario: A refused rename keeps the old name
- **WHEN** a Contributor renames a tag to a name another tag already has
- **THEN** the dialog shows the server's reason and the tag keeps its name

#### Scenario: Contributors can't delete
- **WHEN** a Contributor opens Manage tags
- **THEN** rename and colour controls are offered and no delete control is
