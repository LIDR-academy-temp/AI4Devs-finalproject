# Spec Delta

## MODIFIED Requirements

### Requirement: Users go to the screen that matches their state

A signed-out person SHALL see Welcome for any page that needs sign-in. A signed-in user who hasn't completed onboarding SHALL be sent to One last step. A user who has completed it SHALL be sent from Welcome and One last step to their main screen (docs/02-UX-DESIGN.md §1, flows A and C, and §2.2), which is Lists for a member.

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

#### Scenario: FR-08 a user who is only a buyer lands on To buy

- **GIVEN** the seed user who is only a buyer
- **WHEN** they open Welcome
- **THEN** they see To buy
- Verified by a browser test.
