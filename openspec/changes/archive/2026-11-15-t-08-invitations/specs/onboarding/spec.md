# Spec Delta

## ADDED Requirements

### Requirement: Onboarding through an invitation skips getting started

When `POST /me/onboarding` includes an invitation code that names a pending invitation that hasn't expired, getting started SHALL be skipped, because the user is signing up through that invitation (BR-06). Any other code SHALL be ignored, and getting started runs as usual.

#### Scenario: BR-06 completing onboarding with an invitation creates no group

- **GIVEN** a signed-in user who hasn't completed onboarding and has no membership, and a pending invitation
- **WHEN** they send `POST /me/onboarding` with valid answers and the invitation's code
- **THEN** the response is 200 with onboarding complete and no memberships, no group was created for them, and the invitation is still pending
- Verified by an integration test.

#### Scenario: BR-06 an invitation that no longer works doesn't stop getting started

- **GIVEN** a signed-in user who hasn't completed onboarding, and an invitation code that is expired, cancelled, accepted, declined, or matches none
- **WHEN** they send `POST /me/onboarding` with valid answers and that code
- **THEN** the response is 200, and they own a new group with its first list

### Requirement: One last step returns to the invitation

When a new user reaches One last step from an invitation, One last step SHALL send the invitation's code with the answers and, once completed, return the user to that invitation's screen instead of Lists (docs/02-UX-DESIGN.md §1, flow C, step 3).

#### Scenario: T-08 a new user from an invitation goes back to it

- **GIVEN** a new user who signed in from an invitation's screen
- **WHEN** they complete One last step
- **THEN** they are on that invitation's screen, and they have no group of their own
- Verified by a browser test.
