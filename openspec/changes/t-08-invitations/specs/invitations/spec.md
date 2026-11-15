# Spec Delta

## Purpose

Lets members bring people into their group with a single-use link, as a member or a buyer, and lets the person who opens the link see the invitation and accept or decline it (US-04, FR-06, FR-17), under the access rules in BR-08, BR-09, and BR-12.

## ADDED Requirements

### Requirement: Members create invitations

`POST /groups/{groupId}/invitations` SHALL create a pending invitation of the requested type, member or buyer, with an optional invitee name, that expires 7 days after creation by the service's clock (FR-06, BR-08). The response SHALL include the invitation's link, built from the app's address and an unguessable code. Only members of the group can create one (BR-12).

#### Scenario: FR-06 a member creates a buyer invitation with a name

- **GIVEN** a seed member of a group
- **WHEN** they send a request to create a buyer invitation with the invitee name "Carlos"
- **THEN** the response is 201 with the invitation's type, the name "Carlos", an expiry 7 days after the clock's time, and a link to the Invitation screen that holds the invitation's code
- Verified by an integration test with a controlled clock.

#### Scenario: FR-06 the invitee name is optional

- **GIVEN** a seed member of a group
- **WHEN** they create a member invitation without a name, and another with a name made only of spaces
- **THEN** both are created without an invitee name

#### Scenario: BR-32 an invitee name over 100 characters is refused

- **GIVEN** a seed member of a group
- **WHEN** they create an invitation with an invitee name of 101 characters
- **THEN** the response is 422 `VALIDATION_FAILED` naming the field, and no invitation is created

#### Scenario: AC-16 a buyer can't create an invitation

- **GIVEN** a seed buyer of a group (docs/01-PRD.md §17.2, AC-16)
- **WHEN** they send a request to create a member invitation, and another for a buyer invitation, to that group
- **THEN** both responses are 403 `FORBIDDEN`, and no invitation is created
- Verified by an integration test against the seed data.

#### Scenario: BR-13 a user outside the group can't create an invitation

- **GIVEN** a user who doesn't belong to a seed group
- **WHEN** they send a request to create an invitation to it, to a group that doesn't exist, and to an ID that isn't a UUID
- **THEN** all three responses are the same 404 `NOT_AVAILABLE`

#### Scenario: T-08 each invitation has its own unguessable code

- **GIVEN** a seed member of a group
- **WHEN** they create two invitations
- **THEN** each link holds a different code of 43 URL-safe characters

#### Scenario: T-08 creating invitations is limited to 30 a day

- **GIVEN** a member who has created 30 invitations in the last day
- **WHEN** they create another
- **THEN** the response is 429 `RATE_LIMITED`, and no invitation is created (docs/07-SECURITY-AND-TESTING.md §1)

### Requirement: Members see the pending invitations

`GET /groups/{groupId}/invitations` SHALL return the group's invitations that are pending and haven't expired, each with its ID, type, invitee name, and expiry, and never its code or link (FR-06). Only members of the group can list them (BR-12).

#### Scenario: FR-06 only pending invitations that haven't expired are listed

- **GIVEN** the seed García Group, with a pending invitation for Carlos, one past its expiry, one accepted, one cancelled, and one declined
- **WHEN** a member of the group requests its invitations
- **THEN** the response lists only Carlos's invitation, with the type buyer, the name "Carlos", and its expiry, and no code or link

#### Scenario: BR-12 a buyer can't list the invitations

- **GIVEN** a seed buyer of a group
- **WHEN** they request the group's invitations
- **THEN** the response is 403 `FORBIDDEN`

### Requirement: Members cancel invitations

`DELETE /invitations/{invitationId}` SHALL cancel a pending invitation that hasn't expired, after which its link stops working (FR-06, BR-08). Only members of the invitation's group can cancel it (BR-12). An invitation that was already used, declined, or cancelled, or that has expired, SHALL be refused with `410 INVITATION_INVALID`.

#### Scenario: FR-06 a member cancels a pending invitation

- **GIVEN** a member of a group with a pending invitation
- **WHEN** they cancel it
- **THEN** the response is 204, the invitation is no longer listed, and its link answers 410 `INVITATION_INVALID`

#### Scenario: BR-12 a buyer can't cancel an invitation

- **GIVEN** a seed buyer of a group with a pending invitation
- **WHEN** they send a request to cancel it
- **THEN** the response is 403 `FORBIDDEN`, and the invitation stays pending

#### Scenario: BR-13 an invitation of another group is not available

- **GIVEN** a member of one seed group, and a pending invitation of the other
- **WHEN** they send a request to cancel it, an invitation ID that doesn't exist, and an ID that isn't a UUID
- **THEN** all three responses are the same 404 `NOT_AVAILABLE`

#### Scenario: BR-08 an invitation that is no longer pending can't be cancelled

- **GIVEN** the seed García Group's accepted, cancelled, declined, and expired invitations
- **WHEN** a member of the group sends a request to cancel each one
- **THEN** each response is 410 `INVITATION_INVALID`

### Requirement: Anyone with the link can see the invitation

`GET /invitations/by-code/{code}` SHALL answer without sign-in with the inviter's name, the group's name, and the invitation's type (FR-06). It SHALL reveal nothing else about the group. For a signed-in user, it SHALL also say whether they already have the access the invitation gives (BR-09). A code that matches no invitation SHALL get `404 NOT_AVAILABLE`.

#### Scenario: FR-06 a signed-out person sees who invites them, to which group, and as what

- **GIVEN** the seed's pending invitation for Carlos
- **WHEN** a request without a session asks for it by its code
- **THEN** the response is 200 with the inviter's name, the group's name, and the type buyer, and no emails, phone numbers, members, or buyers

#### Scenario: BR-05 an invitation from a deleted account names "Former user"

- **GIVEN** a pending invitation created by a user whose account was deleted
- **WHEN** someone asks for it by its code
- **THEN** the inviter's name is the "Former user" text in the requester's language

#### Scenario: BR-13 an unknown code is not available

- **WHEN** someone asks for an invitation by a code that matches none
- **THEN** the response is 404 `NOT_AVAILABLE`

### Requirement: A used, declined, cancelled, or expired link no longer works

An invitation that was accepted, declined, or cancelled, or whose expiry has passed by the service's clock, SHALL answer `410 INVITATION_INVALID` to its preview, accept, and decline (BR-08). The interface SHALL then show the message asking for a new invitation.

#### Scenario: AC-11 an invitation older than 7 days asks for a new one

- **GIVEN** an invitation created more than 7 days ago by the clock (docs/01-PRD.md §17.2, AC-11)
- **WHEN** someone asks for it by its code, and a signed-in user tries to accept it
- **THEN** both responses are 410 `INVITATION_INVALID`
- Verified by an integration test with a controlled clock, and by a browser test of the Invitation screen.

#### Scenario: AC-12 an accepted invitation asks for a new one

- **GIVEN** an invitation already accepted by one user (docs/01-PRD.md §17.2, AC-12)
- **WHEN** someone else asks for it by its code and tries to accept it
- **THEN** both responses are 410 `INVITATION_INVALID`, and the other user doesn't join the group
- Verified by an integration test, and by a browser test of the Invitation screen.

#### Scenario: AC-13 a cancelled invitation asks for a new one

- **GIVEN** a cancelled invitation (docs/01-PRD.md §17.2, AC-13)
- **WHEN** someone asks for it by its code and tries to accept it
- **THEN** both responses are 410 `INVITATION_INVALID`
- Verified by an integration test, and by a browser test of the Invitation screen.

#### Scenario: BR-08 a declined invitation asks for a new one

- **GIVEN** a declined invitation
- **WHEN** someone asks for it by its code and tries to accept it
- **THEN** both responses are 410 `INVITATION_INVALID`

### Requirement: Accepting an invitation joins the group

`POST /invitations/by-code/{code}/accept` SHALL give the signed-in, onboarded user an active membership in the invitation's group with its type, and mark the invitation accepted by them at the clock's time, in one transaction (FR-05, FR-06, BR-06, BR-08). The response SHALL name the group and the type the user now has. Each invitation SHALL be accepted at most once.

#### Scenario: AC-10 a new user with a buyer invitation joins as a buyer

- **GIVEN** a new user who completed onboarding with a buyer invitation's code (docs/01-PRD.md §17.2, AC-10)
- **WHEN** they accept the invitation
- **THEN** they have one membership, as a buyer of the invitation's group, and no group of their own was created
- Verified by an integration test, and by a browser test of flow C.

#### Scenario: AC-100 a new user with a member invitation joins as a member

- **GIVEN** a new user who completed onboarding with a member invitation's code (docs/01-PRD.md §17.2, AC-100)
- **WHEN** they accept the invitation
- **THEN** they have one membership, as a member of the invitation's group, and no group of their own was created
- Verified by an integration test, and by a browser test of flow C that also checks they land on Lists.

#### Scenario: AC-14 a buyer who accepts a member invitation becomes a member

- **GIVEN** a seed buyer of a group, and a member invitation to the same group (docs/01-PRD.md §17.2, AC-14)
- **WHEN** they accept it
- **THEN** their membership in that group is now a member membership, they have no second membership in it, and the invitation is accepted
- Verified by an integration test.

#### Scenario: BR-08 two people accept the same link at the same time

- **GIVEN** a pending invitation, and two signed-in users outside its group
- **WHEN** both accept it at the same time
- **THEN** exactly one of them joins the group, and the other gets 410 `INVITATION_INVALID`

#### Scenario: BR-11 a person whose access ended joins again

- **GIVEN** the seed's former buyer, whose membership in the García Group has ended, and a buyer invitation to that group
- **WHEN** they accept it
- **THEN** their membership in the group is active again as a buyer

### Requirement: A user who already has the access is told so

When the user already has the access an invitation gives (a member opening either type, or a buyer opening a buyer invitation), the preview SHALL say so, and accept and decline SHALL be refused with `409 RULE_VIOLATION`, reason `ALREADY_IN_GROUP`, leaving the invitation pending (BR-09).

#### Scenario: AC-15 a member opens an invitation to their own group

- **GIVEN** a seed member of a group, and a pending member invitation and a pending buyer invitation to that group (docs/01-PRD.md §17.2, AC-15)
- **WHEN** they ask for each by its code, then try to accept each
- **THEN** each preview says they already have the access, each accept is refused with 409 `RULE_VIOLATION` and reason `ALREADY_IN_GROUP`, and both invitations stay pending and still work for someone else
- Verified by an integration test, and by a browser test of the Invitation screen.

#### Scenario: BR-09 a buyer opens a buyer invitation to their own group

- **GIVEN** a seed buyer of a group, and a pending buyer invitation to it
- **WHEN** they ask for it by its code, then try to decline it
- **THEN** the preview says they already have the access, the decline is refused with 409 `RULE_VIOLATION` and reason `ALREADY_IN_GROUP`, and the invitation stays pending

### Requirement: Declining an invitation uses it up

`POST /invitations/by-code/{code}/decline` SHALL mark the invitation declined, so its link stops working (BR-08). When the signed-in, onboarded user has never had a membership, getting started SHALL then run for them in the same transaction, giving them their own group and first list (BR-06).

#### Scenario: BR-06 a new user who declines gets their own group

- **GIVEN** a new user who completed onboarding with an invitation's code, and so has no group
- **WHEN** they decline the invitation
- **THEN** the invitation is declined, they don't join its group, and they own a new group with its first list, named in their language

#### Scenario: BR-08 a user with a group declines

- **GIVEN** a seed member of the García Group, and a pending invitation to the Pérez Group, which they don't belong to
- **WHEN** they decline it
- **THEN** the invitation is declined, they don't join the group, and their own groups and memberships are unchanged
