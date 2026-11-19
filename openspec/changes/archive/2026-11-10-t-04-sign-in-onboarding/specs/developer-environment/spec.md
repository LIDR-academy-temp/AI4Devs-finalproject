# Spec Delta

## MODIFIED Requirements

### Requirement: Running the app locally

`npm run dev` SHALL start the app on localhost after setup, without credentials for any outside service.

#### Scenario: The app runs in development

- **GIVEN** a clone where `npm run setup` has succeeded, with `.env` unchanged
- **WHEN** the developer runs `npm run dev` and opens the local address
- **THEN** Welcome loads without errors, with the development sign-in, and signing in as a seed user works without Google credentials

## REMOVED Requirements

### Requirement: Interface text from translation files

**Reason**: It covered only the placeholder page, which Welcome replaces.
**Migration**: Replaced by "Pages take their text from the translation files", which covers every page.

## ADDED Requirements

### Requirement: Pages take their text from the translation files

Every page SHALL take all its visible text and its title from the translation files, in the language chosen for the request, following FR-37. T-04 sets up translations for pages; T-05 adds date and number formatting (FR-38).

#### Scenario: Page text comes from the message files

- **WHEN** Welcome is rendered for a browser that prefers Spanish
- **THEN** its visible text and title match the entries in the Spanish message file, and the document language is Spanish

#### Scenario: T-04 the message files have the same keys

- **WHEN** the Spanish and English message files are compared
- **THEN** they have the same keys and no empty message
- Verified by the existing unit test.
