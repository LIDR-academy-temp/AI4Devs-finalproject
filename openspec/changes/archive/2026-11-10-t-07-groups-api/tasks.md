# Tasks

T-07's acceptance criteria are AC-01 (task 3.3), AC-24 (tasks 4.3 and 4.4), and AC-26 (tasks 5.3 and 5.4); AC-25 moves to T-09 (task 1.4). The other scenarios are named after the rule they verify or after the ticket, as [Security and testing §2.6](../../../docs/07-SECURITY-AND-TESTING.md#26-coverage-targets) describes. Of the definition of done, all three items in scope apply: lint and type checks with an up-to-date OpenAPI document (group 6), interface text in both languages for the group and list names and "Former user" (task 2.2), and the owning documents (group 1).

## 1. Documents first

- [x] 1.1 Add a row to BR-12 in `docs/01-PRD.md` §12.3: members can view the group's members and buyers, buyers can't. Add `/me/onboarding` to FR-05's API column in §19. Update the header's version and date. Verify that no other rule repeats the new row.
- [x] 1.2 Update `docs/02-UX-DESIGN.md`: in §2.2 and the My purchases row of §2.3, and in FR-08 of `docs/01-PRD.md`, members see My purchases while they have reserved or purchased items; in §2.10, add "{First name}'s group" and "My list" with their Spanish. Update the header. Verify that §2.2 and §2.3 say the same.
- [x] 1.3 Update `docs/05-API.md`: in §1, add `GET /me` to the endpoints that don't require onboarding, and add the convention for collections; in §2, add BR-06 to the `POST /me/onboarding` row. Update the header. Verify that §1 and §2 agree.
- [x] 1.4 Update `docs/08-WORK-TICKETS.md`: move AC-25 from T-07 to T-09; in T-04's scope, completing onboarding runs getting started from T-07 (BR-06); in T-08's scope, signing up through an invitation skips it. Update the header. Update the descriptions of issues #33 and #35 with `gh issue edit`. Verify that each issue's acceptance criteria row matches its ticket.
- [x] 1.5 Verify the documents with `npm run check:links`, that every other mention of AC-25 in the repository points to T-09, and that no rule text is copied from the PRD into the changed sections.

## 2. Shared building blocks

- [x] 2.1 Add `routeDefinition()` to `src/server/http/route.ts` (design decision 1). Move the `Language` type to `src/shared/languages.ts`, re-exported from `src/server/http/session.ts`, and add the translator in `src/server/translate.ts`, with `errorMessage` in `src/server/http/language.ts` using it (design decision 2). Verify with `npx tsc --noEmit` and that the existing tests pass.
- [x] 2.2 Add the starting group and list names and "Former user" to `src/i18n/en.json` and `src/i18n/es.json`, with the Spanish from UX design §2.10. Verify that `tests/unit/translations.test.ts` passes.
- [x] 2.3 Add the named response schemas in `src/server/http/schemas.ts` (design decision 4). Verify with `npx tsc --noEmit`.
- [x] 2.4 Add the `session` option to `apiRequest` and Pedro to the seed session users in `tests/support/routes.ts` (design decision 6). Verify with `npx tsc --noEmit`.

## 3. Getting started

- [x] 3.1 Add `startWithoutInvitation` to `src/server/services/groups.ts`, writing `groups`, `memberships`, and `lists` in one transaction with the user's row locked, and doing nothing for a user with any membership (design decision 3). Verify with `npx tsc --noEmit`.
- [x] 3.2 Add the starting group's name from the user's first name or email, shortened to fit BR-32 (design decision 3). Verify with the tests in 3.4.
- [x] 3.3 Write the test `AC-01 a new user without an invitation gets a group they own and a first list` in `tests/integration/`, with a factory user and a controlled clock. Verify that it passes, and that the group, membership, and list rows have the clock's time.
- [x] 3.4 Test the scenarios "BR-06 names follow the user's language", "BR-06 a user who already has a membership gets no group of their own" (active and ended), "BR-06 running getting started twice creates one group" (one after the other, and at the same time on two connections), "BR-32 a very long first name is shortened to fit", and "BR-06 a user with no name is named from their email". Verify that the tests pass.

## 4. The current user

- [x] 4.1 Add `getCurrentUser` to `src/server/services/me.ts`, reading `users`, `memberships`, `groups`, and `items` (design decision 2). Add `GET /me` in `src/app/api/v1/me/definitions.ts` and `route.ts`. Verify with `npx tsc --noEmit`.
- [x] 4.2 Add `visibleTabs` in `src/shared/navigation.ts` (design decision 5). Verify with `npx tsc --noEmit`.
- [x] 4.3 Write the unit test `AC-24 a user who is only a buyer gets only To buy and My purchases` in `tests/unit/`, and test the scenarios "FR-08 a member who doesn't buy gets Lists, People, and Group", "FR-08 a member who reserves gets My purchases too", "FR-08 a member in one group and buyer in another gets every tab", and "FR-08 a user with no group gets no tabs". Verify that the tests pass.
- [x] 4.4 Write the integration test `AC-24 a buyer-only user's memberships give only To buy and My purchases`, for Juan, running `visibleTabs` on the `GET /me` response. Verify that it passes and that the response matches its schema.
- [x] 4.5 Test the scenarios "BR-12 a user in two groups sees each membership with its role", "BR-11 an ended membership isn't returned", "T-07 a request without a session is rejected", "T-07 a user who hasn't completed onboarding reads their state", "FR-08 a member with a reserved item has purchases", and "FR-08 a member with only shipped or no items has no purchases". Verify that the tests pass and every 200 response matches its schema.

## 5. Groups

- [x] 5.1 Add `listGroups` and `getGroup` to `src/server/services/groups.ts`, reading `memberships`, `groups`, and `users`, with `getGroup` calling `requireMemberAccess` first (design decision 2). Verify with `npx tsc --noEmit`.
- [x] 5.2 Add `GET /groups` in `src/app/api/v1/groups/definitions.ts` and `route.ts`, and `GET /groups/{groupId}` in `src/app/api/v1/groups/[groupId]/`. Verify with `npx tsc --noEmit` and `npm run build`.
- [x] 5.3 Write the test `AC-26 a user in two groups lists only those two` for `GET /groups`, with Luis and a factory group. Verify that it passes.
- [x] 5.4 Write the test `AC-26 a request for a group the user doesn't belong to is rejected like a missing one` for `GET /groups/{groupId}`, comparing the third group's, a missing group's, and a malformed ID's responses. Verify that the three bodies are identical.
- [x] 5.5 Test the scenarios "BR-11 a group whose membership ended isn't listed", "BR-12 a member sees the group's members and buyers", "BR-12 a buyer can't view the group's people", "BR-13 a former buyer can't view the group", and "BR-05 a deleted user in a group is named 'Former user'". Verify that the tests pass and every 200 response matches its schema.
- [x] 5.6 Write the permission tests across two groups using the seed data (scenario "T-07 permission tests across two groups using the seed data"): one test per seed user and group case. Verify that they pass.

## 6. OpenAPI document and checks

- [x] 6.1 Regenerate `docs/openapi.yaml` with `npm run openapi:generate`. Verify that it has the three paths with their named schemas and errors, and that a second run changes nothing.
- [x] 6.3 Decide "Former user" by `users.deleted_at` in `personName`, `src/server/services/people.ts`, with the email's local part for a live user without a name (adversarial review, finding 1). Test the scenario "BR-05 only a deleted account is named 'Former user'". Verify that the test passes and fails if the rule keys on the name.
- [x] 6.4 Test the scenarios "BR-11 a user whose access ended keeps My purchases for what they bought" (Pedro, through `GET /me`) and "BR-11 a user with no group but purchases to ship gets only My purchases" (adversarial review, finding 3). Verify that the tests pass.
- [x] 6.5 Say in `docs/02-UX-DESIGN.md` §2.7 that a user with no group but purchases to ship also gets My purchases, below the no-groups message, and key that message on having no memberships in the `src/shared/navigation.ts` comment (adversarial re-review, finding 1). Verify with `npm run check:links`.
- [x] 6.6 Run `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run test:coverage`, and `npm run check:links`. Verify that all pass and the domain services keep at least 80% line coverage.
