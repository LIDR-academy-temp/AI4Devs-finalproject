# profile Specification

## Purpose
Lets a signed-in user change how the app reaches them: their language, their WhatsApp number, and whether they get email, and lets them sign out.

## Requirements

### Requirement: Users change their language, WhatsApp number, and email setting

`PATCH /me` SHALL change any of the signed-in user's language, WhatsApp number, and email setting, validated as in BR-32, and return the current user as `GET /me` does (FR-04). A request with none of them SHALL be refused with 422 `VALIDATION_FAILED`.

#### Scenario: FR-04 a user changes their language

- **GIVEN** a seed user whose language is Spanish
- **WHEN** they send `PATCH /me` with English
- **THEN** the response is 200 with English, and later error messages are in English
- Verified by an integration test.

#### Scenario: FR-04 a user turns email off

- **GIVEN** a seed user who receives email
- **WHEN** they send `PATCH /me` turning email off
- **THEN** the response is 200 and their email setting is off

#### Scenario: BR-32 an invalid number isn't saved

- **WHEN** a user sends `PATCH /me` with a WhatsApp number that isn't a valid international number
- **THEN** the response is 422 `VALIDATION_FAILED` naming the field, and the number is unchanged

#### Scenario: T-04 an empty change is refused

- **WHEN** a user sends `PATCH /me` with no field
- **THEN** the response is 422 `VALIDATION_FAILED`

### Requirement: The WhatsApp number can be changed but not removed

The WhatsApp number SHALL NOT be removable, by the server or in Profile (BR-04, FR-33).

#### Scenario: AC-04 a user can't remove their WhatsApp number

- **GIVEN** a signed-in user (docs/01-PRD.md §17.1, AC-04)
- **WHEN** they send `PATCH /me` with an empty or null WhatsApp number, or clear the field in Profile and save
- **THEN** it isn't allowed: the response is 422 `VALIDATION_FAILED` naming the field, Profile indicates the field, and the number is unchanged
- Verified by an integration test and a browser test.

### Requirement: Profile shows the user's settings and sign-out

Profile SHALL show the language, the WhatsApp number, the email setting, and Sign out, for every user who has completed onboarding (docs/02-UX-DESIGN.md §2.3, screen 12). Changing the language SHALL switch the screen right away. Signing out SHALL end the session and show Welcome.

#### Scenario: AC-99 Profile in English

- **GIVEN** a seed user whose language is English
- **WHEN** they open Profile
- **THEN** all its text is in English, from the English message file
- Verified by a browser test.

#### Scenario: FR-04 changing the language in Profile switches the screen

- **GIVEN** a user on Profile in Spanish
- **WHEN** they choose English
- **THEN** the screen switches to English and English is saved
- Verified by a browser test.

#### Scenario: BR-03 signing out from Profile

- **GIVEN** a user on Profile
- **WHEN** they tap Sign out
- **THEN** they see Welcome, and opening Profile again shows Welcome
- Verified by a browser test.

#### Scenario: T-04 a failed save keeps what the user typed

- **GIVEN** a user who changed their number in Profile
- **WHEN** saving fails because the connection drops
- **THEN** they see that it couldn't be saved, with the new number still in the field (docs/02-UX-DESIGN.md §2.7)
- Verified by a browser test.

#### Scenario: T-04 Profile has no accessibility violations

- **WHEN** Profile is checked in Spanish and in English on a phone-size screen
- **THEN** the automated accessibility checks report no violations
- Verified by a browser test.

### Requirement: Profile loads without a hydration error

Profile SHALL render the same in the server's HTML as in the browser's first render, so the browser doesn't render the page again when it loads (docs/08-WORK-TICKETS.md, T-36). The phone field's country selector SHALL show the country of the saved number from the start, with the browser's name for it once the page has loaded, even where the server's name differs; and SHALL offer every country once the page has loaded, with names and order from the browser in the page's language (FR-37, DESIGN.md Content Constraints).

#### Scenario: T-36 Profile loads without a hydration error in Spanish and English

- **GIVEN** a user who has completed onboarding, with Spanish and then English as their language, and also a user in Spanish whose saved number is from Hong Kong, a country whose name can differ between the server and the browser (docs/08-WORK-TICKETS.md, T-36)
- **WHEN** they open Profile, in Chromium and in WebKit
- **THEN** the page reports no hydration error, the country selector shows the saved number's country with the browser's name for it, and it offers every country with its name in that language
- Verified by a browser test with the scenario's name, which fails when the page reports a hydration error.

#### Scenario: T-36 a country chosen in Profile is saved and stays selected

- **GIVEN** a user in Profile, in Spanish and in English, whose saved number is from another country (docs/08-WORK-TICKETS.md, T-36)
- **WHEN** once the page has loaded, they choose a different country, enter a number from that country, and save
- **THEN** they see that it was saved, the number is saved in international format with that country's calling code (BR-04), and after a reload the country selector shows the chosen country
- Verified by a browser test with the scenario's name.
