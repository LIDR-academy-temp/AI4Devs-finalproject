# Spec Delta

## MODIFIED Requirements

### Requirement: Pages take their text from the translation files

Every page SHALL take all its visible text and its title from the translation files, in the language chosen for the request, following FR-37, and SHALL format dates and numbers in that language, following FR-38. Text written by users SHALL be shown as written.

#### Scenario: Page text comes from the message files

- **WHEN** Welcome is rendered for a browser that prefers Spanish
- **THEN** its visible text and title match the entries in the Spanish message file, and the document language is Spanish

#### Scenario: T-04 the message files have the same keys

- **WHEN** the Spanish and English message files are compared
- **THEN** they have the same keys and no empty message
- Verified by the existing unit test.

#### Scenario: AC-99 dates and numbers use the English format

- **GIVEN** the language English
- **WHEN** the calendar date October 18, 2026 and the numbers 8 and 1,250 are formatted with the app's formats
- **THEN** the short date is 10/18/2026, the long date is October 18, 2026, and the numbers are 8 and 1,250
- Verified by a unit test.

#### Scenario: FR-38 dates and numbers use the Spanish format

- **GIVEN** the language Spanish
- **WHEN** the same date and numbers are formatted
- **THEN** the short date is 18/10/2026, the long date is 18 de octubre de 2026 (DESIGN.md, Content Constraints), and the numbers follow Spanish grouping
- Verified by a unit test.

#### Scenario: FR-38 a calendar date shows the same day everywhere

- **GIVEN** a calendar date with no time, such as a ship date
- **WHEN** it is formatted on the server and in the browser, in any time zone
- **THEN** it shows the same day it was saved with
- Verified by a unit test.
