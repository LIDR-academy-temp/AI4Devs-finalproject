# Spec Delta

## MODIFIED Requirements

### Requirement: Execution views stay current while work is under way
The Executions screen SHALL refresh its list, the selected execution's detail and a run's linked bugs when the project's live event stream reports a change to them, without user action. While the stream is not connected, the selected execution's detail SHALL refresh at least every 5 seconds while it is In Progress or Paused. The list SHALL also refresh while any listed execution is In Progress or Paused. While the stream is connected, the screen SHALL NOT poll. Changes made by the user themselves SHALL appear immediately.

#### Scenario: A colleague records an outcome
- **WHEN** another tester records an outcome on the In Progress execution the user is viewing
- **THEN** the user's view shows that outcome within 5 seconds, without reloading the page

#### Scenario: A colleague starts an execution
- **WHEN** another tester runs a Ready execution while the user has the Executions screen open with the stream connected
- **THEN** the list shows it In Progress within 5 seconds, without reloading the page

#### Scenario: A bug is auto-created on a run the user has open
- **WHEN** another tester sets a run to Fail with auto-create bug on, while the user has that run's panel open
- **THEN** the panel lists the new bug without a page reload

#### Scenario: No polling while connected
- **WHEN** the stream is connected and the selected execution is In Progress with no changes
- **THEN** the screen sends no periodic refetch requests

#### Scenario: Stream unavailable
- **WHEN** the stream cannot connect and the selected execution is In Progress
- **THEN** its detail is refetched at least every 5 seconds until the stream connects again
