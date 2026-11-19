# Spec Delta

## Purpose

The shared states every screen uses when it has nothing to show, is loading, fails, can't be shown to this user, or the user has no group, so each one looks and reads the same everywhere and always offers a way forward (docs/02-UX-DESIGN.md §2.1, §2.7).

## ADDED Requirements

### Requirement: Screens load inside the shell with skeletons

While a screen in the shell loads, the header and navigation SHALL stay visible, and the content area SHALL show placeholder shapes in place of the content, announced to screen readers as loading (docs/02-UX-DESIGN.md §2.7).

#### Scenario: T-05 a loading screen shows skeletons inside the shell

- **GIVEN** a member on Lists, with the next screen's data slow to arrive
- **WHEN** they choose another tab
- **THEN** the header and navigation stay visible, and the content area shows skeletons until the screen arrives
- Verified by a browser test.

### Requirement: A screen that fails offers a way out

When a screen in the shell fails to load, the header and navigation SHALL stay visible, and the content area SHALL say that something went wrong and offer Try again, which loads the screen again (docs/02-UX-DESIGN.md §2.1 principle 7, §2.7).

#### Scenario: T-05 a failed screen can be tried again

- **GIVEN** a member, and a screen in the shell that fails while loading
- **WHEN** it fails
- **THEN** they see the error message with Try again and their navigation, and Try again loads the screen
- Verified by a documented manual check, recorded in the pull request: a placeholder screen is made to fail on a local run, then restored. The browser tests have no way to make a screen fail without adding code that exists only for tests.

### Requirement: Inaccessible and missing addresses show "not available"

An address that doesn't exist, or a screen the user can't see, SHALL show the same "not available" message with a button back to the user's main screen, and SHALL reveal nothing about why (BR-13, docs/02-UX-DESIGN.md §2.7). A screen the user can't see shows it inside the shell; an address that doesn't exist shows it on its own page, outside the shell.

#### Scenario: BR-13 a missing address shows "not available"

- **GIVEN** a member
- **WHEN** they open an address in the app that doesn't exist
- **THEN** they see the "not available" message, and its button takes them to Lists
- Verified by a browser test.

### Requirement: A user with no group is told how to get one

A user with no active membership SHALL see the "not in any group yet" notice, with the advice to ask for an invitation, above the content of every screen in the shell. If they still have purchases to ship, their main screen is My purchases; otherwise it is Profile (BR-11, FR-08, docs/02-UX-DESIGN.md §2.7). **Create a group** comes in milestone 2 (FR-05).

#### Scenario: BR-11 the former buyer sees the notice and My purchases

- **GIVEN** the seed's former buyer, whose only membership has ended and who still has a purchased item
- **WHEN** they open the app after signing in
- **THEN** they land on My purchases with the "not in any group yet" notice above it, and their only tab is My purchases
- Verified by a browser test.

### Requirement: Empty states give guidance

Screens with nothing to show SHALL use one shared empty state: an icon, the message from the translation files that says what to do next, and an optional action (docs/02-UX-DESIGN.md §2.7). The shell's placeholder screens SHALL use it.

#### Scenario: T-05 a placeholder screen uses the empty state

- **GIVEN** a member
- **WHEN** they open People
- **THEN** they see the shared empty state with the placeholder message from the translation files
- Verified by a browser test.
