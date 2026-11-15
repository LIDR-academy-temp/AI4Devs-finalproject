# Spec Delta

## Purpose

The Group screen, where members see who is in the current group with their contact details, invite members and buyers with a link shared on WhatsApp, and keep track of and cancel pending invitations (US-04, FR-06, FR-07, docs/02-UX-DESIGN.md §2.4).

## ADDED Requirements

### Requirement: Group shows the current group's people

Group SHALL show the current group (T-05) with its name, the subtitle naming its owner, the members with their emails and the Owner tag on the owner, and the buyers with their WhatsApp numbers, counting only active memberships (FR-07, BR-04, BR-12). It SHALL be built to DESIGN.md and `design/stitch/08-group`, and only members reach it (FR-08).

#### Scenario: FR-07 a member sees the group's members and buyers

- **GIVEN** the seed's owner of the García Group
- **WHEN** they open Group
- **THEN** they see the group's name, the subtitle naming them as the owner, each member with their email and the Owner tag on themselves, each buyer with their WhatsApp number, and not the former buyer
- Verified by a browser test.

#### Scenario: T-08 a group with no buyers invites one

- **GIVEN** a new user who has completed onboarding, whose group has no buyers
- **WHEN** they open Group
- **THEN** the buyers section shows "Invite the person who will buy" with **Invite a buyer** (docs/02-UX-DESIGN.md §2.7)
- Verified by a browser test.

### Requirement: Members create an invitation link from Group

**Invite a member** and **Invite a buyer** SHALL each open a sheet with the optional "Who are you inviting?" field (BR-32) and **Create link**. Once created, the sheet SHALL show the link, **Share on WhatsApp**, **Copy link**, and when the link expires, with no toast (docs/02-UX-DESIGN.md §2.4 and §2.7). When it closes, the new invitation SHALL be among the pending invitations.

#### Scenario: FR-06 a member creates a buyer invitation and shares it on WhatsApp

- **GIVEN** a member on Group, using the app in English
- **WHEN** they tap **Invite a buyer**, type "Carlos", and tap **Create link**
- **THEN** the sheet shows the link, **Copy link**, when it expires, and **Share on WhatsApp**, which opens WhatsApp with the invitation message in English naming Carlos, the member, the group, the type in lowercase, and the link (docs/02-UX-DESIGN.md §2.6)
- Verified by a browser test that checks the WhatsApp address without opening it.

#### Scenario: FR-06 an invitation without a name starts its message without one

- **GIVEN** a member on Group, using the app in Spanish
- **WHEN** they create a member invitation without typing a name
- **THEN** the WhatsApp message is the Spanish invitation message for a member, starting without a name
- Verified by a browser test.

#### Scenario: FR-06 a member copies the link

- **GIVEN** a member who has just created an invitation
- **WHEN** they tap **Copy link**
- **THEN** the link is on the clipboard
- Verified by a browser test.

#### Scenario: BR-32 the invitee name stops at its limit

- **GIVEN** a member in the invite sheet
- **WHEN** they type more than 100 characters as the name
- **THEN** the field shows its character counter and keeps only 100 characters (docs/02-UX-DESIGN.md §2.7)
- Verified by a browser test.

#### Scenario: T-08 a failed invitation keeps what the member typed

- **GIVEN** a member in the invite sheet with a name typed
- **WHEN** creating the link fails because the connection drops
- **THEN** the sheet shows that it couldn't be saved, inline, with the name still filled in
- Verified by a browser test.

### Requirement: Group lists the pending invitations

Group SHALL list the pending invitations that haven't expired, under a heading with their count. Each row SHALL show the invitee's name, or the invitation's type when it has none, "Invited as {type}", when it expires, and **Cancel invitation** (FR-06, docs/02-UX-DESIGN.md §2.4). The section SHALL not be shown when there are none.

#### Scenario: AC-101 the pending invitation for Carlos

- **GIVEN** a member who creates a buyer invitation named Carlos (docs/01-PRD.md §17.2, AC-101)
- **WHEN** they open Group
- **THEN** the pending invitations show Carlos, invited as a buyer, and when it expires
- Verified by a browser test in Spanish and English.

### Requirement: Members cancel a pending invitation from Group

**Cancel invitation** SHALL cancel the invitation, remove its row, and confirm with the "Invitation cancelled" toast (FR-06, docs/02-UX-DESIGN.md §2.7). If cancelling fails, the row SHALL stay and the error SHALL be shown inline, never in a toast.

#### Scenario: FR-06 a member cancels an invitation

- **GIVEN** a member on Group with a pending invitation
- **WHEN** they tap **Cancel invitation** on it
- **THEN** the row is gone, the "Invitation cancelled" toast appears, and the invitation's link shows the message asking for a new invitation
- Verified by a browser test.

### Requirement: Successful actions are confirmed with a toast

The toast SHALL follow DESIGN.md, Toast, and docs/02-UX-DESIGN.md §2.7: one at a time, above the bottom bar on phones, with a **Close** button, announced politely to screen readers, and closing after about 5 seconds, waiting while the pointer is over it or it has focus.

#### Scenario: T-08 the toast closes by itself or with Close

- **GIVEN** a member who has just cancelled an invitation
- **WHEN** they wait about 5 seconds, and, after cancelling another, tap **Close**
- **THEN** the toast closes each time, and while it was shown it was in a polite live region
- Verified by a browser test.

### Requirement: Group loads, fails, and is accessible like every screen

Group SHALL show skeletons while it loads and the shared error state if loading fails (docs/02-UX-DESIGN.md §2.7). It SHALL be in the user's language, with all its text from the translation files, and pass the automated accessibility checks (docs/02-UX-DESIGN.md §2.8).

#### Scenario: T-08 Group has no accessibility violations

- **WHEN** Group is checked in Spanish and in English on a phone-size screen, with the invite sheet open, a link created, and the toast shown
- **THEN** the automated accessibility checks report no violations
- Verified by a browser test.
