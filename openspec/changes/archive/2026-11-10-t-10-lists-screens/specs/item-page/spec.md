# Spec Delta

## Purpose

The page for one item, which shows its status and request details and offers the actions the user can take for that status, with no mode switch (US-07, FR-07, FR-08, FR-23, BR-19). T-10 builds it for members; the buyer's parts come with T-12 to T-16.

## ADDED Requirements

### Requirement: The item page shows the item's status and request

The item page SHALL show the item's name, its status with icon, text, and color, naming the buyer when reserved or purchased and saying "you" when it is the user, who it is for, the quantity, and the item's notes (docs/02-UX-DESIGN.md §2.4, §2.5). It SHALL open for members and buyers of the item's group (BR-12).

#### Scenario: T-10 a reserved item names its buyer

- **GIVEN** the seed member Ana, and the seed item reserved by Juan
- **WHEN** they open the item
- **THEN** they see "Reserved by Juan", who it is for, the quantity, and the notes
- Verified by a browser test.

### Requirement: Notes are shown as plain text

The item's notes SHALL be shown exactly as typed, as plain text with line breaks kept; nothing in them SHALL be interpreted as markup or run (docs/07-SECURITY-AND-TESTING.md §1).

#### Scenario: AC-95 notes with HTML or script tags are shown as text

- **GIVEN** an item whose notes contain HTML and script tags, added by one member (docs/01-PRD.md §17.9, AC-95)
- **WHEN** another member of the group opens the item
- **THEN** the tags appear as text, no element from the notes is created, and no script from them runs
- Verified by a browser test.

### Requirement: Open in store opens the item's link

An item with a link SHALL show **Open in store**, which opens the link in a new tab without giving the store access to the app's page (FR-23). An item with no link SHALL NOT show it.

#### Scenario: T-10 Open in store opens the link in a new tab

- **GIVEN** a member, and an item with a link
- **WHEN** they open the item
- **THEN** Open in store points to the link and opens in a new tab, and an item with no link has no Open in store
- Verified by a browser test.

### Requirement: Members see the actions their item's status allows

The page SHALL offer the actions in docs/02-UX-DESIGN.md §2.5 for the user and status: **I'll buy it** on pending items, for members and buyers; for members, **Edit** while BR-19 allows editing and **Delete** while it allows deleting, in the item's menu, with Edit as the main button on unavailable items. Both kinds of actions SHALL show together, with no mode switch (FR-07, FR-08).

#### Scenario: AC-23 a member opens a pending item

- **GIVEN** a member of a group with pending items (docs/01-PRD.md §17.2, AC-23)
- **WHEN** they open a pending item
- **THEN** they see "I'll buy it" and, in the item's menu, Edit and Delete, on the same page
- Verified by a browser test.

#### Scenario: BR-19 actions on reserved, purchased, and unavailable items

- **GIVEN** the seed member Ana
- **WHEN** they open the item reserved by Juan, a purchased item, and the unavailable item
- **THEN** the reserved item offers Edit but not Delete or I'll buy it; the purchased item offers no Edit, Delete, or I'll buy it; the unavailable item has Edit as its main button and offers Delete
- Verified by a browser test.

#### Scenario: BR-19 which actions each status allows

- **WHEN** the actions are decided for a member and for a buyer, for each status, and for an item the user reserved
- **THEN** they match docs/02-UX-DESIGN.md §2.5 within BR-19, and a buyer never gets Edit or Delete
- Verified by a unit test.

### Requirement: Deleting an item is confirmed

Delete SHALL ask for confirmation naming the item, and confirming SHALL delete the item and return to its list (BR-19). Cancelling SHALL change nothing.

#### Scenario: T-10 a member deletes a pending item

- **GIVEN** a member on their pending item's page
- **WHEN** they choose Delete and confirm
- **THEN** they are back on the item's list, and the item is no longer in it
- Verified by a browser test.

### Requirement: An action refused because the item changed refreshes the page

When Delete or I'll buy it is refused because the item changed or no longer exists, the page SHALL show "This item changed. Showing the latest." and refresh; when I'll buy it is refused because someone else reserved the item, it SHALL show "Someone else already reserved it" and refresh (BR-20, BR-23, docs/02-UX-DESIGN.md §2.7). AC-67 and AC-68 are verified in T-12.

#### Scenario: BR-20 a member deletes an item that was reserved meanwhile

- **GIVEN** a member on a pending item's page, and the item reserved by another request after the page loaded
- **WHEN** they choose Delete and confirm
- **THEN** they see the item-changed message, and the page shows the item as reserved, with no Delete
- Verified by a browser test, with the reservation written to the test database.

### Requirement: Items the user can't see show "not available"

Opening the page of an item that doesn't exist, was deleted, is in an archived list, or is in a group the user doesn't belong to SHALL show the same "not available" state (BR-13).

#### Scenario: AC-27 a member opens a deleted item

- **GIVEN** a member, and the address of an item they deleted (docs/01-PRD.md §17.2, AC-27)
- **WHEN** they open it
- **THEN** they see "This page isn't available." with the button to their main screen
- Verified by a browser test.

#### Scenario: AC-25 a buyer opens another group's item

- **GIVEN** the seed user who is only a buyer in García Group, and the Pérez Group item (docs/01-PRD.md §17.2, AC-25)
- **WHEN** they open its address
- **THEN** they see "This page isn't available."
- Verified by a browser test.

### Requirement: The item page works in both languages and is accessible

All text on the item page SHALL come from the translation files in the user's language (FR-37), status labels included, and the page SHALL meet WCAG 2.1 AA, including keyboard use of the item's menu and the delete confirmation (docs/02-UX-DESIGN.md §2.8).

#### Scenario: AC-99 the item page in English

- **GIVEN** a user whose language is English
- **WHEN** they open a pending item
- **THEN** the status, labels, and actions are the English texts
- Verified by a browser test.

#### Scenario: T-10 the item page has no accessibility violations

- **WHEN** a pending item, an unavailable item, the open item menu, and the delete confirmation are checked in Spanish and in English on a phone-size screen
- **THEN** the automated accessibility checks report no violations
- Verified by a browser test.
