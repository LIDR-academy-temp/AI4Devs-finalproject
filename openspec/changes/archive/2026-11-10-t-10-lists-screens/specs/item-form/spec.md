# Spec Delta

## Purpose

The form members use to add an item with every detail, and to edit or move an item, validated as they type so a request is right the first time (US-10, FR-13, FR-16, FR-39).

## ADDED Requirements

### Requirement: The form has the item's fields on one screen

The item form SHALL show, on one screen with no "More options", a link (optional), the name (required), the list, the quantity (1 by default), and the notes with their help text (FR-13, docs/02-UX-DESIGN.md §2.4). The recipient is added by T-13; editing SHALL keep the item's recipient. Only members SHALL reach the form (BR-12).

#### Scenario: T-10 a member adds an item with every field

- **GIVEN** a member on the form for their list
- **WHEN** they enter a link, a name, a quantity of 2, and notes, and save
- **THEN** they are back on that list, and the item shows its name and quantity as `Pending`; its page shows the notes and Open in store
- Verified by a browser test.

#### Scenario: BR-13 a buyer opens the add form

- **GIVEN** the seed user who is only a buyer
- **WHEN** they open the add form's address
- **THEN** they see the "not available" state
- Verified by a browser test.

### Requirement: Fields are checked as the user types and on save

Each field SHALL be checked against BR-32 on save, and again as the user types once it has been checked (FR-39). A failing field SHALL be indicated under it with a plain-language message, and the item SHALL NOT be saved. Text fields SHALL show a character counter near their limit and stop accepting text at it (docs/02-UX-DESIGN.md §2.7). A server field error SHALL be shown the same way.

#### Scenario: AC-40 a member saves with an empty name

- **GIVEN** a member on the item form (docs/01-PRD.md §17.4, AC-40)
- **WHEN** they save with an empty name
- **THEN** nothing is saved, they stay on the form, and the name field is indicated
- Verified by a browser test.

#### Scenario: T-10 a quantity of 0 and a link that isn't a web address are indicated

- **GIVEN** a member on the item form
- **WHEN** they save with a quantity of 0, then correct it and save with the link "not a link"
- **THEN** each time nothing is saved and that field is indicated, and the quantity's message goes away as soon as they type a valid quantity
- Verified by a browser test.

#### Scenario: BR-32 the name stops at its limit with a counter

- **GIVEN** a member on the item form
- **WHEN** they type 105 characters in the name
- **THEN** the name holds 100 characters, and a counter shows the limit is reached
- Verified by a browser test.

### Requirement: Saving keeps the user's text when it fails

When saving fails for a lost connection or an unexpected error, the form SHALL say "Couldn't save. Check your connection and try again" and keep everything the user typed (docs/02-UX-DESIGN.md §2.7).

#### Scenario: T-10 the form keeps the text when the connection fails

- **GIVEN** a member who filled in the item form, whose connection fails when they save
- **WHEN** they save
- **THEN** they see the couldn't-save message, and every field keeps its value
- Verified by a browser test that blocks the request.

### Requirement: Editing an item uses the same form

Members SHALL open the form from the item page to edit an item while BR-19 allows it, with the fields filled in from the item; saving SHALL return to the item page with the changes (FR-16). Opening the edit address of an item that can't be edited SHALL show its item page, and of an item the user can't see, the "not available" state (BR-13).

#### Scenario: T-10 a member edits an item

- **GIVEN** a member on the edit form of their pending item
- **WHEN** they change its name and notes and save
- **THEN** the item page shows the new name and notes
- Verified by a browser test.

#### Scenario: BR-19 the edit address of a purchased item shows its page

- **GIVEN** the seed member Ana, and the seed's purchased item
- **WHEN** they open its edit address
- **THEN** they see the item page, with no Edit action
- Verified by a browser test.

### Requirement: Editing an item's list moves it

The form's list field SHALL offer the group's lists, and saving with another list SHALL move the item there (FR-16).

#### Scenario: AC-39 a member moves an item to another list by editing it

- **GIVEN** a member with the lists "Birthday" and "Medicine", and an item in "Birthday" (docs/01-PRD.md §17.4, AC-39)
- **WHEN** they edit the item, choose "Medicine", and save
- **THEN** the item appears in "Medicine" and no longer in "Birthday"
- Verified by a browser test. AC-39's API behavior is verified by T-09's integration test.

### Requirement: An edit refused because the item changed keeps what was typed

When an edit is refused because the item changed since the form loaded (BR-20), the form SHALL show "This item changed. Showing the latest.", load the latest item, and keep what the member typed so they can save it again (docs/02-UX-DESIGN.md §2.7). If the item no longer exists, the form SHALL show the "not available" state.

#### Scenario: BR-20 a member saves after someone else edited the item

- **GIVEN** a member on the edit form, and an edit to the same item saved by another request after the form loaded
- **WHEN** they save their change
- **THEN** they see the item-changed message, their typed values are still in the form, and saving again succeeds with their values
- Verified by a browser test.

### Requirement: The form works in both languages and is accessible

All form text, including field messages, SHALL come from the translation files in the user's language (FR-37), and the form SHALL meet WCAG 2.1 AA: labels always visible above each field, errors tied to their fields for screen readers, and 48 px targets (docs/02-UX-DESIGN.md §2.8).

#### Scenario: AC-99 the item form in English

- **GIVEN** a user whose language is English
- **WHEN** they open the item form
- **THEN** the title, labels, help text, and Save button are the English texts
- Verified by a browser test.

#### Scenario: T-10 the item form has no accessibility violations

- **WHEN** the add form, empty and with field errors, and the edit form are checked in Spanish and in English on a phone-size screen
- **THEN** the automated accessibility checks report no violations
- Verified by a browser test.
