# Spec Delta

## Purpose

The Lists screen, where members see a group's lists and their items with each item's status, switch and create lists, and request an item by typing only its name (US-10, FR-11, FR-13), on phones and on desktop.

## ADDED Requirements

### Requirement: Lists shows one list of the current group

Lists SHALL show one list of the current group (T-05): the list chosen in the list switcher, kept in the address, or otherwise the group's first list by creation (docs/02-UX-DESIGN.md §2.4). An address naming a list that isn't a list of the current group SHALL show the group's first list. Only members SHALL reach Lists (FR-08).

#### Scenario: T-10 a new member lands on their first list

- **GIVEN** a new user who has completed onboarding
- **WHEN** they open Lists
- **THEN** they see their group's first list by name, with the empty state that tells them to type what they want above
- Verified by a browser test.

#### Scenario: T-10 a list from another group in the address shows the first list

- **GIVEN** a member whose current group is their own, and the ID of a list in a group they don't belong to
- **WHEN** they open Lists with that list in the address
- **THEN** they see their own group's first list, and nothing from the other list
- Verified by a browser test.

### Requirement: The list switcher changes lists and creates one

The list menu SHALL name the current list, list the group's lists to switch to, and offer **New list** (FR-11, FR-12). New list SHALL ask for a name, validated against BR-32 as the user types, create the list, and show it. Rename, archive, and delete are milestone 2.

#### Scenario: T-10 a member switches to another list

- **GIVEN** a member of a group with two lists
- **WHEN** they open the list menu and choose the second list
- **THEN** Lists shows the second list's name and its items, and Refresh keeps it
- Verified by a browser test.

#### Scenario: FR-12 a member creates a list from the list menu

- **GIVEN** a member on Lists
- **WHEN** they choose New list, type "Medicine", and create it
- **THEN** Lists shows the empty list "Medicine", and the list menu offers it
- Verified by a browser test.

#### Scenario: BR-32 an empty list name isn't created

- **GIVEN** a member in the New list dialog
- **WHEN** they create a list with an empty name
- **THEN** no list is created, and the name field is indicated
- Verified by a browser test.

### Requirement: A group without lists offers to create one

When the current group has no lists, Lists SHALL show the "No lists yet" empty state with an action that creates a list (docs/02-UX-DESIGN.md §2.7).

#### Scenario: T-10 a group with no lists

- **GIVEN** a member whose current group has no lists
- **WHEN** they open Lists
- **THEN** they see the "No lists yet" empty state with an action that opens New list
- Verified by a browser test, with the group's only list removed in the test database.

### Requirement: Quick add creates an item from its name

Lists SHALL have a quick field: typing a name and pressing Enter or its Add button SHALL create a pending item in the current list with that name alone, show it in the list, and clear the field for the next one (FR-13). The field SHALL follow BR-32 and keep its text when saving fails (docs/02-UX-DESIGN.md §2.7).

#### Scenario: AC-38 a member types only a name and saves

- **GIVEN** a member inside a list (docs/01-PRD.md §17.4, AC-38)
- **WHEN** they type only a name in the quick field and press Enter
- **THEN** the item appears in the list as `Pending`, and the quick field is empty
- Verified by a browser test.

#### Scenario: BR-32 quick add with an empty name

- **GIVEN** a member inside a list
- **WHEN** they press Enter in the empty quick field
- **THEN** no item is created, and the field is indicated
- Verified by a browser test.

#### Scenario: T-10 quick add keeps the text when the save fails

- **GIVEN** a member inside a list, whose connection fails when they save
- **WHEN** they type a name in the quick field and press Enter
- **THEN** they see "Couldn't save. Check your connection and try again", and the name is still in the field
- Verified by a browser test that blocks the request.

### Requirement: Items show their status and are ordered for decisions

Each item SHALL show its name, who it is for, its quantity, and its status with icon, text, and color, naming the buyer when reserved or purchased (docs/02-UX-DESIGN.md §2.4, §2.5). `Unavailable` items SHALL come first, then the rest newest first, and `Shipped` items SHALL be in a collapsed section at the end with their count. Each item SHALL open its item page.

#### Scenario: T-10 the seed lists show every status in order

- **GIVEN** the seed member Ana, whose group's two lists hold items in every status
- **WHEN** they open "Anthony's birthday", then "Medicine"
- **THEN** in the first, the reserved and purchased items name their buyer, and the two shipped items are in a collapsed section with their count that expands when chosen; in the second, the unavailable item is first
- Verified by a browser test.

#### Scenario: T-10 tapping an item opens its page

- **GIVEN** a member on Lists with an item
- **WHEN** they tap the item
- **THEN** the item page opens
- Verified by a browser test.

#### Scenario: T-10 the order of items

- **WHEN** the order is decided for items in every status, created at different times
- **THEN** unavailable items come first, then pending, reserved, and purchased items newest first, and shipped items are set apart for the collapsed section
- Verified by a unit test.

### Requirement: Items can be filtered by person and by status

Lists SHALL offer filters by person (All, each person with items in the list, and No person when some item has none) and by status (All, and each status present in the list, with its count) (docs/02-UX-DESIGN.md §2.4). Both filters SHALL apply together, and SHALL reset when the list changes. When no item matches, Lists SHALL say so.

#### Scenario: T-10 a member filters by person and by status

- **GIVEN** the seed member Ana, on "Anthony's birthday"
- **WHEN** they choose a person, then a status
- **THEN** only that person's items in that status are shown, and choosing All for each shows every item again
- Verified by a browser test.

#### Scenario: T-10 filters that match no item say so

- **GIVEN** the seed member Ana, on "Medicine"
- **WHEN** they choose Grandma, then Pending
- **THEN** they see "No items match these filters." instead of an empty list
- Verified by a browser test.

#### Scenario: T-10 the filter choices come from the list

- **WHEN** the filter choices are decided for a list with items for two people, one with no person, in two statuses
- **THEN** the person choices are All, the two people by name, and No person, and the status choices are All and the two statuses with their counts
- Verified by a unit test.

### Requirement: Lists has an Add button for the full form

Lists SHALL have a floating **+ Add** button above the navigation that opens the item form for the current list (docs/02-UX-DESIGN.md §2.2).

#### Scenario: T-10 + Add opens the form for the current list

- **GIVEN** a member on their second list
- **WHEN** they tap + Add
- **THEN** the item form opens with that list chosen
- Verified by a browser test.

### Requirement: Refresh shows the latest items

Lists SHALL load fresh items when opened and when the user taps Refresh, keeping the current list, the filters, and the quick field's text (docs/02-UX-DESIGN.md §2.2).

#### Scenario: T-10 Refresh shows an item added elsewhere

- **GIVEN** a member on Lists, and an item added to the list by another request after the screen loaded
- **WHEN** they tap Refresh
- **THEN** the new item is in the list, on the same list
- Verified by a browser test.

### Requirement: Desktop shows the list and the item side by side

From 1024 px wide, Lists SHALL show the list in a column and the selected item page beside it, and the item side SHALL say to choose an item when none is selected (DESIGN.md, Responsive Layout Model). Below 1024 px, the item page SHALL replace the list.

#### Scenario: T-10 a member on desktop opens an item

- **GIVEN** a member on a screen 1280 px wide, on Lists
- **WHEN** they choose an item
- **THEN** the list stays visible on the left, and the item page shows beside it
- Verified by a browser test.

### Requirement: Lists works in both languages and is accessible

All text on Lists SHALL come from the translation files in the user's language (FR-37), and Lists SHALL meet WCAG 2.1 AA, including 48 px touch targets, labeled fields, and keyboard use of the list menu and filters (docs/02-UX-DESIGN.md §2.8).

#### Scenario: AC-99 Lists in English

- **GIVEN** a user whose language is English
- **WHEN** they open Lists
- **THEN** the list menu, quick field, filters, status labels, and + Add are the English texts
- Verified by a browser test.

#### Scenario: T-10 Lists has no accessibility violations

- **WHEN** Lists with items, with the shipped section open, and with the New list dialog open are checked in Spanish and in English on a phone-size screen
- **THEN** the automated accessibility checks report no violations
- Verified by a browser test.
