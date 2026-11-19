# Spec Delta

## MODIFIED Requirements

### Requirement: Tab screens not built yet show a placeholder

People, To buy, and My purchases SHALL each have a screen at its address, inside the shell, that tells the user the screen is on its way, until the ticket that builds it replaces it. A user who opens the address of a tab they don't have SHALL see the "not available" state (BR-13).

#### Scenario: BR-13 a member who doesn't buy opens To buy

- **GIVEN** a new user who has completed onboarding
- **WHEN** they open the To buy address directly
- **THEN** they see the "not available" state, with the header and their navigation
- Verified by a browser test.

#### Scenario: BR-13 a user who is only a buyer opens Lists

- **GIVEN** the seed user who is only a buyer
- **WHEN** they open the Lists address directly
- **THEN** they see the "not available" state
- Verified by a browser test.

#### Scenario: BR-13 a user who is only a buyer opens Group

- **GIVEN** the seed user who is only a buyer
- **WHEN** they open the Group address directly
- **THEN** they see the "not available" state, and nothing about the group's people
- Verified by a browser test.
