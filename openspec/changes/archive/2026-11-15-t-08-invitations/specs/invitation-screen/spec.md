# Spec Delta

## Purpose

The screen a person opens from an invitation link, which shows who is inviting them, to which group, and as what, and takes them through sign-in and One last step to accept or decline it (US-04, FR-06, docs/02-UX-DESIGN.md §1, flow C, and §2.3, screen 3).

## ADDED Requirements

### Requirement: The link opens the Invitation screen

An invitation's link SHALL open the Invitation screen at `/invitations/{code}`, outside the shell, built to DESIGN.md and `design/stitch/03-invitation`. It SHALL show the inviter's name, the group's name, and the type, member or buyer, with its text from the translation files (docs/02-UX-DESIGN.md §2.3).

#### Scenario: FR-06 a signed-out person opens a buyer invitation

- **GIVEN** the seed's pending buyer invitation, and a signed-out person
- **WHEN** they open its link
- **THEN** they see the inviter's name, the group's name, that they are invited as a buyer, and **Continue with Google**, and no Accept button
- Verified by a browser test.

### Requirement: Signing in from the invitation comes back to it

On the Invitation screen, **Continue with Google** and the development sign-in SHALL return the person to the same invitation. A signed-in user who hasn't completed onboarding SHALL be sent to One last step with the invitation, which brings them back to it once completed (flow C, step 3).

#### Scenario: T-08 a new user signs in from an invitation and returns to it

- **GIVEN** a signed-out person on an invitation's screen
- **WHEN** they sign in as a new user and complete One last step
- **THEN** they are back on the same invitation's screen, with **Accept** and **Decline**
- Verified by a browser test using the development sign-in.

### Requirement: A signed-in user accepts or declines

A signed-in, onboarded user who doesn't already have the access SHALL see **Accept** and **Decline**. After accepting, a member SHALL land on Lists with the joined group as the current group, and a buyer on To buy (flow C, step 4). After declining, the user SHALL land on their main screen (flow C, step 5).

#### Scenario: AC-100 a new user accepts a member invitation and lands on Lists

- **GIVEN** a new user who opened a member invitation's link (docs/01-PRD.md §17.2, AC-100)
- **WHEN** they sign in, complete One last step, and accept
- **THEN** they land on Lists showing the invitation's group, and they have no group of their own
- Verified by a browser test in Spanish and English.

#### Scenario: AC-10 a new user accepts a buyer invitation and lands on To buy

- **GIVEN** a new user who opened a buyer invitation's link (docs/01-PRD.md §17.2, AC-10)
- **WHEN** they sign in, complete One last step, and accept
- **THEN** they land on To buy, their only tabs are To buy and My purchases, and they have no group of their own
- Verified by a browser test.

#### Scenario: BR-06 a new user declines and lands on their own group

- **GIVEN** a new user who opened an invitation's link, signed in, and completed One last step
- **WHEN** they decline
- **THEN** they land on Lists showing their own new group's first list, and the link no longer works
- Verified by a browser test.

#### Scenario: T-08 a failed accept keeps the invitation on screen

- **GIVEN** a signed-in user on an invitation's screen
- **WHEN** accepting fails because the connection drops
- **THEN** they stay on the screen with a message that it couldn't be saved, and can try again (docs/02-UX-DESIGN.md §2.7)
- Verified by a browser test.

### Requirement: A link that no longer works says so

When the invitation was used, declined, or cancelled, has expired, or its code matches none, the screen SHALL show only the message asking for a new invitation and a way back to Welcome, or to the main screen for a signed-in user (BR-08, flow C, step 6).

#### Scenario: AC-11 an expired link on the screen

- **GIVEN** the seed's expired invitation (docs/01-PRD.md §17.2, AC-11)
- **WHEN** someone opens its link
- **THEN** they see the message asking for a new invitation, with no Accept button
- Verified by a browser test.

#### Scenario: AC-12 an accepted link on the screen

- **GIVEN** the seed's accepted invitation (docs/01-PRD.md §17.2, AC-12)
- **WHEN** a signed-in user who isn't in the group opens its link
- **THEN** they see the message asking for a new invitation, with no Accept button
- Verified by a browser test.

#### Scenario: AC-13 a cancelled link on the screen

- **GIVEN** the seed's cancelled invitation (docs/01-PRD.md §17.2, AC-13)
- **WHEN** someone opens its link
- **THEN** they see the message asking for a new invitation, with no Accept button
- Verified by a browser test.

### Requirement: A user already in the group is told so

When the signed-in user already has the access the invitation gives, the screen SHALL show the message that they already belong to the group, with a way to their main screen, and no Accept or Decline, and the invitation SHALL stay valid (BR-09, flow C, step 7).

#### Scenario: AC-15 a member opens an invitation to their own group

- **GIVEN** a seed member of the García Group, and the seed's pending buyer invitation to it (docs/01-PRD.md §17.2, AC-15)
- **WHEN** they open its link
- **THEN** they see the message that they already belong to the group, with no Accept or Decline, and the invitation is still pending
- Verified by a browser test.

### Requirement: The Invitation screen works in both languages and is accessible

The Invitation screen SHALL be in the person's language, with all its text from the translation files, and SHALL pass the automated accessibility checks in each of its states (docs/02-UX-DESIGN.md §2.8).

#### Scenario: T-08 the Invitation screen has no accessibility violations

- **WHEN** the screen is checked in Spanish and in English on a phone-size screen, signed out, ready to accept, already in the group, and no longer valid
- **THEN** the automated accessibility checks report no violations
- Verified by a browser test.
