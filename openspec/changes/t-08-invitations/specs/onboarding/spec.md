# Spec Delta

## MODIFIED Requirements

### Requirement: Completing onboarding saves the answers and starts the user's group

`POST /me/onboarding` SHALL save the language, the WhatsApp number in international format, and the time the terms were accepted, mark onboarding complete, and run getting started (BR-06) in the same transaction, then return the current user as `GET /me` does (FR-02, BR-01, BR-04). It SHALL require a signed-in user, not a completed onboarding. When the request includes an invitation code that names a pending invitation that hasn't expired, getting started SHALL be skipped, because the user is signing up through that invitation (BR-06); any other code SHALL be ignored, and getting started runs.

#### Scenario: BR-06 completing onboarding gives a new user their group and first list

- **GIVEN** a signed-in user who hasn't completed onboarding and has no membership
- **WHEN** they send `POST /me/onboarding` with a language, a valid number, and the acceptance
- **THEN** the response is 200 with onboarding complete and one membership as owner of their new group, which has the first list, named in the chosen language
- Verified by an integration test.

#### Scenario: BR-06 completing onboarding with an invitation creates no group

- **GIVEN** a signed-in user who hasn't completed onboarding and has no membership, and a pending invitation
- **WHEN** they send `POST /me/onboarding` with valid answers and the invitation's code
- **THEN** the response is 200 with onboarding complete and no memberships, no group was created for them, and the invitation is still pending
- Verified by an integration test.

#### Scenario: BR-06 an invitation that no longer works doesn't stop getting started

- **GIVEN** a signed-in user who hasn't completed onboarding, and an invitation code that is expired, cancelled, accepted, declined, or matches none
- **WHEN** they send `POST /me/onboarding` with valid answers and that code
- **THEN** the response is 200, and they own a new group with its first list

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

## ADDED Requirements

### Requirement: One last step returns to the invitation

When a new user reaches One last step from an invitation, One last step SHALL send the invitation's code with the answers and, once completed, return the user to that invitation's screen instead of Lists (docs/02-UX-DESIGN.md §1, flow C, step 3).

#### Scenario: T-08 a new user from an invitation goes back to it

- **GIVEN** a new user who signed in from an invitation's screen
- **WHEN** they complete One last step
- **THEN** they are on that invitation's screen, and they have no group of their own
- Verified by a browser test.
