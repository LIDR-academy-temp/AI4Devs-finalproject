# T-07 Groups, memberships, and access

**Issue:** [#33](https://github.com/ojordan0/AI4Devs-finalproject/issues/33) · **Ticket:** [docs/08-WORK-TICKETS.md, T-07](../../../docs/08-WORK-TICKETS.md#t-07-groups-memberships-and-access) · **Branch:** `feat/t-07-groups-api`

**Covers:** Epic E-02. Stories: US-07 (main), US-01, US-04. Functional requirements: FR-05 (getting started), FR-07 (viewing the group), FR-08, FR-17, FR-18. Business rules: BR-06, BR-12, BR-13. Acceptance criteria: AC-01, AC-24, AC-26; AC-25 moves to T-09, as proposed below.

## Why

Every screen and endpoint after this one works inside a group: lists, items, recipients, and addresses all belong to one. T-07 makes sure each new user starts with a group and a list, that the app can tell which groups a user is in and in which role, and that nobody reaches another group's members. T-09 (lists and items) depends on it, and D2 is due on November 19, 2026.

## What Changes

- **Getting started (BR-06):** a domain service that gives a user with no membership a group they own, named after their first name, and a first list, both named in the user's language from the translation files. It does nothing for a user who already has, or had, a membership, so it can safely run more than once. T-04's onboarding endpoint calls it when onboarding completes.
- **`GET /me`:** the signed-in user, their active memberships with each group's name and their role, and whether they have reserved or purchased items. It is also available before onboarding is complete.
- **`GET /groups`:** the user's groups with their role in each. Only the user's own groups; there is no directory (FR-17).
- **`GET /groups/{groupId}`:** the group with its members, owner marked, and buyers. Members only; a buyer of the group gets `403 FORBIDDEN`, and anyone outside it gets the same `404 NOT_AVAILABLE` as a missing group (BR-13).
- **Tabs for each user (FR-08):** one shared function that decides which tabs a user sees from their memberships, so the interface (T-05) and the tests apply the same rule.
- **Permission tests across groups** using the seed data: the three endpoints for every seed user against both seed groups, a third group, a missing group, and a malformed ID.
- **Documents updated first**, because reviewing this ticket found gaps:
  - **AC-25 can't be tested in T-07.** It opens a link to an item, and items have no endpoint until T-09. AC-25 moves to T-09, which builds `GET /items/{itemId}`; T-07 tests the same rule (BR-13) for groups.
  - **When getting started runs.** BR-06 and flow A say a new user gets a group and a list, but no endpoint is named. It runs when onboarding completes, because the group and list are named in the language the user confirms there. `POST /me/onboarding` lists BR-06 in [API §2](../../../docs/05-API.md#2-endpoints), FR-05 lists that endpoint in [PRD §19](../../../docs/01-PRD.md#19-traceability), and the scopes of T-04 and T-08 say who calls it and when it is skipped.
  - **`GET /me` before onboarding.** [API §1](../../../docs/05-API.md#1-conventions) requires an onboarded user on every endpoint except the invitation preview and onboarding, but `GET /me` returns the onboarding state, which is only useful before onboarding is done. `GET /me` is added to the exceptions.
  - **Who can see a group's members.** BR-12 doesn't say. The Group screen is for members ([UX design §2.3](../../../docs/02-UX-DESIGN.md#23-screens)), and buyers reach the people they need through items (BR-30), so a row is added to BR-12: members can view the group's members and buyers; buyers can't.
  - **Spanish names for the starting group and list.** [UX design §2.10](../../../docs/02-UX-DESIGN.md#210-spanish-interface-strings) has no Spanish for "{First name}'s group" and "My list". Rows are added.
  - **When members see My purchases.** FR-08 and [UX design §2.2](../../../docs/02-UX-DESIGN.md#22-navigation) say "once they reserve an item", and §2.3 says "members with reserved items". A member with only purchased items still needs the tab to ship them, so all three say "while they have reserved or purchased items".
  - **How collections are returned.** No endpoint returns a collection yet. [API §1](../../../docs/05-API.md#1-conventions) gets one convention for all of them: an object with one property named after the resource, for example `{ "groups": [...] }`.

## Capabilities

### New Capabilities

- `groups`: getting started with a group and a list, listing the user's groups, and viewing a group's members and buyers, each limited to the user's own groups.
- `current-user`: who is signed in, their memberships and onboarding state, and which tabs their memberships give them.

### Modified Capabilities

None. The `group-access` check from T-03 is used as specified.

## Non-goals

| Left out | Owner |
| --- | --- |
| `POST /me/onboarding`, and calling getting started from it | T-04 |
| Skipping getting started for a user who signs up through an invitation | T-08, which builds accepting invitations |
| The response for a signed-in user who hasn't finished onboarding, on the endpoints that require it | T-04 |
| `POST /groups` (create a group), `PATCH /groups/{groupId}` (rename), ownership transfer, removing and leaving | Milestone 2 (increments 6 and 9) |
| WhatsApp numbers in the group's people | Milestone 2 (FR-33, FR-35) |
| The bottom navigation and header that use the tabs function | T-05 |
| AC-25, and AC-26 for lists and items | T-09 |

## Impact

- **Endpoints (new):** `GET /api/v1/me`, `GET /api/v1/groups`, `GET /api/v1/groups/{groupId}`, in `src/app/api/v1/me/` and `src/app/api/v1/groups/`.
- **Services (new):** getting started and group reads in `src/server/services/groups.ts`; the current user in `src/server/services/me.ts`. The membership check in `src/server/services/access.ts` (existing) is reused.
- **Shared code (new):** the tabs function in `src/shared/navigation.ts`.
- **Shared code (existing):** the route wrapper in `src/server/http/route.ts` gets a helper to declare a route separately from its handler, so tests build real endpoints with their own dependencies; `src/server/http/openapi.ts` registers the new response schemas.
- **Tables (existing):** `groups`, `memberships`, and `lists` (written by getting started); `users` and `items` (read). No schema change, so no migration.
- **Translations (existing files):** `src/i18n/en.json` and `src/i18n/es.json` get the starting group and list names and "Former user".
- **Tests:** `tests/support/routes.ts` (existing) signs in any user, not only seed users; new integration tests for each endpoint and for getting started, and a unit test for the tabs.
- **Generated file (existing):** `docs/openapi.yaml` gets the three paths.
- **Changed documents:** `docs/01-PRD.md` (FR-08, BR-12 row, §19 FR-05), `docs/02-UX-DESIGN.md` (§2.2, §2.3, §2.7, §2.10), `docs/05-API.md` (§1 sign-in exception and collections, §2 onboarding row), and `docs/08-WORK-TICKETS.md` (AC-25 to T-09, T-04 and T-08 scope).
- **GitHub:** the descriptions of issues #33 and #35 list AC-25 under T-09.
