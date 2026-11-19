# Spec Delta

## Purpose

The frame every signed-in screen lives in: the header with the group selector, Refresh, and the avatar, and the tab navigation that shows each user only the screens their memberships allow, on phones and on desktop.

## ADDED Requirements

### Requirement: Navigation shows only the user's tabs

Every screen for a user who has completed onboarding SHALL show tab navigation with the tabs that the shared tab rule gives the user (FR-08, docs/02-UX-DESIGN.md §2.2), in display order, each with an icon and its name from the translation files. The tab for the current screen SHALL be marked as current, visibly and for screen readers.

#### Scenario: FR-08 a member who doesn't buy sees Lists, People, and Group

- **GIVEN** a new user who has completed onboarding, so they are a member of their own group with no purchases
- **WHEN** they open Lists
- **THEN** the navigation has Lists, People, and Group, and no To buy or My purchases, with Lists marked as current
- Verified by a browser test.

#### Scenario: AC-24 a user who is only a buyer sees only To buy and My purchases

- **GIVEN** the seed user who is only a buyer (docs/01-PRD.md §17.2, AC-24)
- **WHEN** they open their main screen
- **THEN** the navigation has To buy and My purchases, with no Lists, People, or Group
- Verified by a browser test.

#### Scenario: FR-08 a member in one group and buyer in another sees every tab

- **GIVEN** the seed user who owns one group and is a buyer in another
- **WHEN** they open their main screen
- **THEN** the navigation has Lists, People, Group, To buy, and My purchases
- Verified by a browser test.

#### Scenario: FR-08 choosing a tab opens its screen

- **GIVEN** a member on Lists
- **WHEN** they choose People in the navigation
- **THEN** the People screen opens and People is marked as current
- Verified by a browser test.

### Requirement: Navigation sits at the bottom on phones and at the side on desktop

Below 768 px the tabs SHALL be a bottom bar at least 64 px tall; from 768 px they SHALL be a left sidebar with the same tabs (docs/02-UX-DESIGN.md §2.2, DESIGN.md). Every screen SHALL fit from 360 px wide without horizontal scrolling, and screen content SHALL never be hidden behind the bottom bar.

#### Scenario: T-05 the shell fits a 360 px wide screen

- **GIVEN** a member on a screen 360 px wide
- **WHEN** they open Lists and Profile
- **THEN** the page doesn't scroll sideways, the header and bottom bar are fully visible, and every tab is at least 48 px tall and wide
- Verified by a browser test.

#### Scenario: T-05 desktop shows the sidebar

- **GIVEN** a member on a screen 1280 px wide
- **WHEN** they open Lists
- **THEN** the tabs are in a sidebar on the left, there is no bottom bar, and the screen content is centered next to it
- Verified by a browser test.

### Requirement: The header has the group, Refresh, and the avatar

Every screen in the shell SHALL have a header with, on the left, the group selector, the current group's name, or the app name, as the group-selector requirement decides; and on the right, Refresh and the user's avatar (docs/02-UX-DESIGN.md §2.2). The avatar SHALL show the user's initials and SHALL open Profile, with an accessible name that says so.

#### Scenario: T-05 the avatar opens Profile

- **GIVEN** a member on Lists
- **WHEN** they tap their avatar
- **THEN** Profile opens
- Verified by a browser test.

#### Scenario: T-05 a buyer with no member group sees the app name

- **GIVEN** the seed user who is only a buyer
- **WHEN** they open their main screen
- **THEN** the header shows the app name, with no group selector
- Verified by a browser test.

### Requirement: Refresh reloads the current screen

Refresh SHALL reload the current screen's data from the server without a full page load and without losing the current address, and SHALL show that it is working until the data arrives (docs/02-UX-DESIGN.md §2.2). There SHALL be no live updates.

#### Scenario: T-05 Refresh shows data changed elsewhere

- **GIVEN** a member on Lists in Spanish, whose language is changed to English by another request after the screen loaded
- **WHEN** they tap Refresh
- **THEN** the screen shows the English texts, on the same address
- Verified by a browser test.

### Requirement: The group selector chooses the group for member screens

Lists, People, and Group SHALL show one group: the current group. The group selector SHALL list the groups the user is a member of, by name, and SHALL appear only when there are two or more; with one, the header SHALL show its name (docs/02-UX-DESIGN.md §2.2). Choosing a group SHALL make it current and reload the screen. To buy and My purchases SHALL not depend on it.

#### Scenario: T-05 a member of two groups switches between them

- **GIVEN** a user who is a member of their own group and of a second group
- **WHEN** they open the group selector on Lists and choose the second group
- **THEN** the header and Lists show the second group
- Verified by a browser test.

#### Scenario: T-05 a member of one group sees its name with no selector

- **GIVEN** a new user who has completed onboarding
- **WHEN** they open Lists
- **THEN** the header shows their group's name, and there is no group selector
- Verified by a browser test.

#### Scenario: FR-08 a buyer group isn't offered in the selector

- **GIVEN** the seed user who owns one group and is a buyer in another
- **WHEN** they open Lists
- **THEN** the header shows the group they own, with no group selector
- Verified by a browser test.

### Requirement: The current group is remembered on the device

The chosen group SHALL be remembered in the browser across screens and visits. When nothing is remembered, or the remembered group is not one the user is currently a member of, the current group SHALL be the first of their member groups by name.

#### Scenario: T-05 the chosen group is kept after reloading

- **GIVEN** a member of two groups who chose the second one
- **WHEN** they reload the page and open People
- **THEN** the second group is still current
- Verified by a browser test.

#### Scenario: BR-12 a remembered group the user no longer belongs to is ignored

- **GIVEN** a remembered group that the user is not a member of
- **WHEN** the current group is decided
- **THEN** it is the first of the user's member groups by name, and a user with no member group has no current group
- Verified by a unit test.

### Requirement: Each user has a main screen

A user's main screen SHALL be the screen of their first tab, or Profile when they have no tab (docs/02-UX-DESIGN.md §2.2). It is where an onboarded user lands and where the "not available" state leads back to.

#### Scenario: FR-08 the main screen follows the tabs

- **WHEN** the main screen is decided for a member, a user who is only a buyer, and a user with no group and no purchases
- **THEN** it is Lists, To buy, and Profile respectively
- Verified by a unit test.

### Requirement: Tab screens not built yet show a placeholder

People, Group, To buy, and My purchases SHALL each have a screen at its address, inside the shell, that tells the user the screen is on its way, until the ticket that builds it replaces it. A user who opens the address of a tab they don't have SHALL see the "not available" state (BR-13).

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

### Requirement: The shell works in both languages and is accessible

All text in the header and navigation, including accessible names, SHALL come from the translation files in the page's language (FR-37). The shell SHALL meet WCAG 2.1 AA: visible focus, keyboard use of every control, touch targets of at least 48 px, and labeled navigation (docs/02-UX-DESIGN.md §2.8).

#### Scenario: AC-99 the shell in English

- **GIVEN** a user whose language is English
- **WHEN** they open Lists
- **THEN** the header, the tab names, the accessible names, and the page title are the English texts, and the document language is English
- Verified by a browser test.

#### Scenario: FR-37 the shell in Spanish

- **GIVEN** a user whose language is Spanish
- **WHEN** they open Lists
- **THEN** the header and the tab names are the Spanish texts, and the document language is Spanish
- Verified by a browser test.

#### Scenario: T-05 the shell has no accessibility violations

- **WHEN** Lists, a placeholder tab screen, and the open group selector are checked in Spanish and in English on a phone-size screen
- **THEN** the automated accessibility checks report no violations
- Verified by a browser test.

#### Scenario: T-05 the shell can be used with the keyboard

- **GIVEN** a member of two groups on Lists
- **WHEN** they move through the header and navigation with the keyboard
- **THEN** each control shows a focus ring, and the group selector opens, moves between groups, and selects one with the keyboard
- Verified by a browser test.
