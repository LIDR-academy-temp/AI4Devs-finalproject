# Spec Delta

## Purpose

Takes a new user from Welcome through One last step, collecting their language, WhatsApp number, and age and terms acceptance, and gives them their group and first list so they can start right away.

## ADDED Requirements

### Requirement: Welcome lets a person choose a language and sign in

Welcome SHALL show the product name, a language selector, and Continue with Google (docs/02-UX-DESIGN.md §2.3, screen 1). Its language SHALL follow the browser, Spanish when the browser prefers neither, and changing the selector SHALL switch the screen right away and be remembered until onboarding (docs/02-UX-DESIGN.md §2.8).

#### Scenario: FR-37 Welcome follows the browser's language

- **GIVEN** a browser that prefers English
- **WHEN** a signed-out person opens the app
- **THEN** Welcome is in English, with its text from the English message file, and the document language is English
- Verified by a browser test.

#### Scenario: FR-37 choosing a language on Welcome switches the screen

- **GIVEN** Welcome in English
- **WHEN** the person chooses Spanish
- **THEN** the screen switches to Spanish without signing in

#### Scenario: AC-99 Welcome in English

- **GIVEN** a person who chose English on Welcome, in a browser that prefers Spanish
- **WHEN** they open Welcome
- **THEN** all its text is in English, from the English message file, and the document language is English
- Verified by a browser test.

#### Scenario: T-04 Welcome has no accessibility violations

- **WHEN** Welcome is checked in Spanish and in English on a phone-size screen
- **THEN** the automated accessibility checks report no violations
- Verified by a browser test.

### Requirement: Users go to the screen that matches their state

A signed-out person SHALL see Welcome for any page that needs sign-in. A signed-in user who hasn't completed onboarding SHALL be sent to One last step. A user who has completed it SHALL be sent from Welcome and One last step to Lists (docs/02-UX-DESIGN.md §1, flow A).

#### Scenario: T-04 a signed-out person is sent to Welcome

- **GIVEN** a signed-out person
- **WHEN** they open Profile or Lists
- **THEN** they see Welcome
- Verified by a browser test.

#### Scenario: T-04 a new user is sent to One last step

- **GIVEN** a user who signed in for the first time
- **WHEN** they open Welcome, Lists, or Profile
- **THEN** they see One last step
- Verified by a browser test.

#### Scenario: T-04 an onboarded user skips onboarding

- **GIVEN** a user who has completed onboarding
- **WHEN** they open Welcome or One last step
- **THEN** they see Lists

### Requirement: One last step collects the language, the age and terms acceptance, and the WhatsApp number

One last step SHALL show the language, prefilled with the Welcome choice, the "I am 18 or older and accept the terms" checkbox, and a WhatsApp number field with a country selector and automatic formatting (FR-02, FR-03, docs/02-UX-DESIGN.md §2.3 and §2.8). Changing the language SHALL switch the screen right away.

#### Scenario: AC-99 One last step in English

- **GIVEN** a new user who chose English on Welcome, in a browser that prefers Spanish
- **WHEN** they reach One last step
- **THEN** all its text is in English, country names are in English, and the number is formatted as it is written in English
- Verified by a browser test.

#### Scenario: AC-98 the Welcome language is prefilled and can be changed

- **GIVEN** a new user who chose Spanish on Welcome (docs/01-PRD.md §17.1, AC-98)
- **WHEN** they reach One last step, change the language to English, and continue
- **THEN** the language field showed Spanish, the screen switches to English, and English is saved as their language
- Verified by a browser test.

#### Scenario: AC-02 the user can't continue without the age and terms box

- **GIVEN** a new user on One last step (docs/01-PRD.md §17.1, AC-02)
- **WHEN** they try to continue without checking the 18-or-older box
- **THEN** they can't continue: the box is indicated, and the server refuses the request with 422 `VALIDATION_FAILED` and leaves the user not onboarded
- Verified by a browser test and an integration test of `POST /me/onboarding`.

#### Scenario: AC-03 an invalid WhatsApp number isn't saved

- **GIVEN** a new user on One last step (docs/01-PRD.md §17.1, AC-03)
- **WHEN** they enter a WhatsApp number that isn't a valid international number and continue
- **THEN** it isn't saved, and the field is indicated; the server refuses it with 422 `VALIDATION_FAILED` naming the field
- Verified by a browser test and an integration test of `POST /me/onboarding`.

#### Scenario: T-04 One last step has no accessibility violations

- **WHEN** One last step is checked in Spanish and in English on a phone-size screen, including with its fields indicated
- **THEN** the automated accessibility checks report no violations
- Verified by a browser test.

#### Scenario: T-04 a failed save keeps what the user entered

- **GIVEN** a new user who filled in One last step
- **WHEN** saving fails because the connection drops
- **THEN** they see that it couldn't be saved, with what they entered still filled in (docs/02-UX-DESIGN.md §2.7)
- Verified by a browser test.

### Requirement: Completing onboarding saves the answers and starts the user's group

`POST /me/onboarding` SHALL save the language, the WhatsApp number in international format, and the time the terms were accepted, mark onboarding complete, and run getting started (BR-06) in the same transaction, then return the current user as `GET /me` does (FR-02, BR-01, BR-04). It SHALL require a signed-in user, not a completed onboarding.

#### Scenario: BR-06 completing onboarding gives a new user their group and first list

- **GIVEN** a signed-in user who hasn't completed onboarding and has no membership
- **WHEN** they send `POST /me/onboarding` with a language, a valid number, and the acceptance
- **THEN** the response is 200 with onboarding complete and one membership as owner of their new group, which has the first list, named in the chosen language
- Verified by an integration test.

#### Scenario: BR-04 the number is saved in international format

- **GIVEN** a new user
- **WHEN** they complete onboarding with a valid number written with spaces or dashes
- **THEN** the saved number is in international format, without spaces or dashes

#### Scenario: T-04 completing onboarding again changes nothing

- **GIVEN** a user who has completed onboarding
- **WHEN** they send `POST /me/onboarding` again with different answers
- **THEN** the response is 200 with their current account unchanged, and no second group is created

#### Scenario: T-04 onboarding without a session is rejected

- **WHEN** `POST /me/onboarding` has no session
- **THEN** the response is 401 `NOT_SIGNED_IN`

#### Scenario: T-04 a new user lands on their first list

- **GIVEN** a new user on One last step
- **WHEN** they complete it
- **THEN** they land on Lists, which shows their first list's name
- Verified by a browser test.
