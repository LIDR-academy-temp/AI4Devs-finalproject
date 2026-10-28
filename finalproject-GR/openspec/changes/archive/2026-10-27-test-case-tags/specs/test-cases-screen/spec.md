# Spec Delta

## ADDED Requirements

### Requirement: The test case detail shows and edits its tags
The test case detail SHALL show the test case's tags as coloured badges, and the New Test Case modal SHALL offer the same tag picker for the tags to create it with. For Contributors and Admins the detail SHALL offer a tag picker that searches the project's tags, adds or removes one on selection and saves at once, and offers to create a tag when the typed name doesn't exist yet. Viewers SHALL see the badges only.

#### Scenario: Adding an existing tag
- **WHEN** a Contributor opens the tag picker on a test case and selects "smoke"
- **THEN** the "smoke" badge appears on the test case and stays after a reload

#### Scenario: Creating a tag from the picker
- **WHEN** a Contributor types "payments" in the picker, where no such tag exists, and chooses to create it
- **THEN** the tag is created and added to the test case

#### Scenario: Tagging a new test case
- **WHEN** a Contributor opens New Test Case, picks "smoke" and creates the new tag "payments" in its tag picker, then saves
- **THEN** the created test case carries both tags

#### Scenario: Viewer sees badges only
- **WHEN** a Viewer opens a test case that carries tags
- **THEN** the badges are shown and no tag picker is offered

### Requirement: The tree can be filtered by tags
The Test Cases tree SHALL offer a Tags filter where the user picks one or more tags. With tags picked, the tree SHALL show the test cases carrying any of them, plus the folders above those test cases, combined with the name and status filters. Drag and drop SHALL be paused while it is active, as with the other filters.

#### Scenario: Filtering by two tags
- **WHEN** the user picks "smoke" and "regression" in the Tags filter
- **THEN** only test cases carrying "smoke" or "regression" are shown, inside their folders

#### Scenario: Combined with status
- **WHEN** the user picks the tag "smoke" and the status `Ready`
- **THEN** only Ready test cases carrying "smoke" are shown

### Requirement: Tags are managed in a Manage tags dialog
The Tags filter SHALL offer Manage tags, which lists every tag of the project with its colour and the number of test cases carrying it. Contributors and Admins SHALL be able to rename a tag and pick its colour from the palette there; Admins SHALL be able to delete a tag after confirming a message that states how many test cases carry it. Viewers SHALL see the list without edit controls.

#### Scenario: Recolouring a tag
- **WHEN** a Contributor opens Manage tags and picks blue for "smoke"
- **THEN** every "smoke" badge on the screen turns blue

#### Scenario: Deleting a tag after confirming
- **WHEN** an Admin deletes "legacy", which three test cases carry, and confirms the message stating three test cases
- **THEN** "legacy" disappears from the dialog, the filter, and those test cases

#### Scenario: A refused rename keeps the old name
- **WHEN** a Contributor renames a tag to a name another tag already has
- **THEN** the dialog shows the server's reason and the tag keeps its name

#### Scenario: Contributors can't delete
- **WHEN** a Contributor opens Manage tags
- **THEN** rename and colour controls are offered and no delete control is
